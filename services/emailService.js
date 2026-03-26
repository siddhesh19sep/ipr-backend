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
        service: "gmail",
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_PASS,
        },
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
    // 1. Try Resend API first (Works on Render)
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
            }
        });

        console.log(`[RESEND API] Sent email to ${to} | ID:`, response.data.id);
        transporterStatus.provider = "Resend HTTPS API";
        return response.data;

    } catch (resendError) {
        const status = resendError.response?.status;
        const errorData = resendError.response?.data || resendError.message;
        
        console.warn(`[RESEND API] HTTP ${status} | Failed to send email:`, JSON.stringify(errorData, null, 2));
        
        if (status === 403 || status === 422) {
            console.warn("[RESEND API] This usually means your Resend key is in Sandbox mode and can only send to yourself.");
        }

        // 2. Fallback to Gmail if configured
        if (gmailTransporter) {
            try {
                const info = await gmailTransporter.sendMail({
                    from: `"IPR Protocol" <${GMAIL_USER}>`,
                    to,
                    subject,
                    text,
                    html: html || `<p>${text}</p>`,
                });
                console.log(`[GMAIL SMTP] Fallback successful! Sent to ${to}`);
                transporterStatus.provider = "Gmail SMTP (Fallback)";
                return { success: true, id: info.messageId, provider: "gmail" };
            } catch (gmailError) {
                console.error("[GMAIL SMTP] Fallback also failed:", gmailError.message);
            }
        }

        // 3. MOCK FALLBACK FOR DEVELOPMENT:
        // If it's a 422 (unverified email in Sandbox) or 401 (invalid key), 
        // we log the content so the developer is not blocked.
        console.log("\n--- [DEVELOPER MOCK EMAIL] ---");
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Content: ${text}`);
        console.log("------------------------------\n");
        
        // Return a mock success with a flag so the controller can inform the UI
        return { 
            mock: true, 
            id: "mock_" + Date.now(),
            reason: resendError.response?.status === 422 ? "UNVERIFIED_SENDER" : "API_ERROR"
        };
    }
};


/**
 * Returns the current status of the email transporter.
 */
exports.getServiceStatus = () => {
    return transporterStatus;
};
