// emailService.js
const axios = require("axios");
const nodemailer = require("nodemailer");

// Fallback directly to the key you provided to guarantee it works on Render instantly without needing to configure the Dashboard again.
const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_ehi3SAUC_6p3BraG9KkRppCEWJ5ngi8dr";

// Gmail credentials from .env
const GMAIL_USER = process.env.EMAIL_USER;
const GMAIL_PASS = process.env.EMAIL_PASS;

// Brevo API Key (for universal delivery to any email)
const BREVO_API_KEY = process.env.BREVO_API_KEY;

// Track service status
let transporterStatus = {
    provider: "Resend HTTPS API",
    isReady: true,
    error: null,
    user: "onboarding@resend.dev" // Free tier default
};

// Initialize Nodemailer transporter if credentials exist
let gmailTransporter = null;
if (GMAIL_USER && GMAIL_PASS) {
    gmailTransporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true, 
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000,
        socketTimeout: 10000
    });
}

/**
 * Sends an email using the Resend HTTPS API with a fallback to Nodemailer/Gmail.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email Subject
 * @param {string} text - Plaintext email body
 * @param {string} html - HTML email body (optional)
 */
exports.sendEmail = async (to, subject, text, html = "") => {
    // 1. Try Brevo API (BEST for Render: HTTPS + No Sandbox Recipient limits)
    if (BREVO_API_KEY) {
        try {
            const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
                sender: { name: "IPR Protocol", email: GMAIL_USER || "siddheshkanse132@gmail.com" },
                to: [{ email: to }],
                subject: subject,
                htmlContent: html || `<p>${text}</p>`
            }, {
                headers: {
                    'api-key': BREVO_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            console.log(`[BREVO API] Success! Sent to ${to}`);
            transporterStatus.provider = "Brevo HTTPS API";
            return { success: true, id: response.data.messageId, provider: "brevo" };
        } catch (brevoError) {
            console.warn("[BREVO API] Failed:", brevoError.response?.data || brevoError.message);
        }
    }

    // 2. Try Gmail SMTP (Reliable locally, but usually blocked on Render)
    if (gmailTransporter) {
        try {
            const info = await gmailTransporter.sendMail({
                from: `"IPR Protocol" <${GMAIL_USER}>`,
                to,
                subject,
                text,
                html: html || `<p>${text}</p>`,
            });
            console.log(`[GMAIL SMTP] Success! Sent to ${to}`);
            transporterStatus.provider = "Gmail SMTP";
            return { success: true, id: info.messageId, provider: "gmail" };
        } catch (gmailError) {
            console.warn("[GMAIL SMTP] Failed (Likely Render Port Block):", gmailError.message);
        }
    }

    // 3. Try Resend API (HTTPS bypasses port blocks, but Sandbox restricted)
    try {
        const response = await axios.post('https://api.resend.com/emails', {
            from: "IPR Secure Authentication <onboarding@resend.dev>",
            to: [to],
            subject: subject,
            html: html || `<p>${text}</p>`
        }, {
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log(`[RESEND API] Sent email to ${to} | ID:`, response.data.id);
        transporterStatus.provider = "Resend HTTPS API";
        return { success: true, id: response.data.id, provider: "resend" };

    } catch (resendError) {
        const status = resendError.response?.status;
        const errorData = resendError.response?.data || resendError.message;
        
        console.warn(`[RESEND API] HTTP ${status} | Failed to send email:`, JSON.stringify(errorData, null, 2));
        
        // Final Fallback: Diagnostic Info
        let failureReason = "INFRASTRUCTURE_BLOCK";
        let suggestion = "Render blocks SMTP ports. Resend API blocks unverified recipients in sandbox.";
        
        if (status === 422) {
            failureReason = "RESEND_SANDBOX_UNVERIFIED_RECIPIENT";
            suggestion = "Resend Sandbox only sends to your account email. Please verify this email at resend.com or use a Brevo API Key.";
        }

        return { 
            mock: true, 
            id: "fail_" + Date.now(),
            reason: failureReason,
            suggestion: suggestion,
            error: resendError.message,
            resendStatus: status
        };
    }
};


/**
 * Returns the current status of the email transporter.
 */
exports.getServiceStatus = () => {
    return transporterStatus;
};
