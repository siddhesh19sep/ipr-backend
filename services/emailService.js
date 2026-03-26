// emailService.js
const axios = require("axios");
const nodemailer = require("nodemailer");

// Fallback directly to the key you provided to guarantee it works on Render instantly without needing to configure the Dashboard again.
const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_ehi3SAUC_6p3BraG9KkRppCEWJ5ngi8dr";

// Gmail credentials from .env
const GMAIL_USER = process.env.EMAIL_USER;
const GMAIL_PASS = process.env.EMAIL_PASS;

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
    // 1. Try Gmail SMTP first if configured (Verifid app password is most reliable)
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
            console.warn("[GMAIL SMTP] Failed, trying Resend API:", gmailError.message);
        }
    }

    // 2. Try Resend API (HTTPS bypasses port blocks, but Sandbox restricted)
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
            timeout: 10000 // 10 seconds
        });

        console.log(`[RESEND API] Sent email to ${to} | ID:`, response.data.id);
        transporterStatus.provider = "Resend HTTPS API";
        return { success: true, id: response.data.id, provider: "resend" };

    } catch (resendError) {
        const status = resendError.response?.status;
        const errorData = resendError.response?.data || resendError.message;
        
        console.warn(`[RESEND API] HTTP ${status} | Failed to send email:`, JSON.stringify(errorData, null, 2));
        
        if (status === 403 || status === 422) {
            console.warn("[RESEND API] REASON: Key is Sandbox mode. ONLY verified emails work.");
        }

        // 3. MOCK FALLBACK (Only for development or clear infrastructure failure)
        let failureReason = "SMTP_BLOCKED_OR_SANDBOX_RESTRICTION";
        let suggestion = "If using Resend Sandbox, you must verify the recipient email in the Resend Dashboard.";
        
        if (status === 422) {
            failureReason = "RESEND_SANDBOX_UNVERIFIED_RECIPIENT";
            suggestion = "Resend Sandbox only sends to verified emails. Please verify this email at resend.com/emails or use your own account email.";
        }

        console.log("\n--- [DELIVERY FAILURE DIAGNOSTIC] ---");
        console.log(`To: ${to}`);
        console.log(`Error: ${resendError.message}`);
        console.log(`Suggestion: ${suggestion}`);
        console.log("------------------------------------\n");
        
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
