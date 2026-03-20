// emailService.js
const axios = require("axios");

// Fallback directly to the key you provided to guarantee it works on Render instantly without needing to configure the Dashboard again.
const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_ehi3SAUC_6p3BraG9KkRppCEWJ5ngi8dr";

// Track service status
let transporterStatus = {
    provider: "Resend HTTPS API",
    isReady: true,
    error: null,
    user: "onboarding@resend.dev" // Free tier default
};

/**
 * Sends an email using the Resend HTTPS API.
 * Bypasses all Render outbound SMTP port blocks perfectly.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email Subject
 * @param {string} text - Plaintext email body
 * @param {string} html - HTML email body (optional)
 */
exports.sendEmail = async (to, subject, text, html = "") => {
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

        console.log(`[RESEND API] Sent Secure OTP to ${to} | ID:`, response.data.id);
        return response.data;

    } catch (error) {
        console.error("[RESEND API] Critical Email Drop Error:", JSON.stringify(error.response?.data || error.message, null, 2));
        throw error;
    }
};

/**
 * Returns the current status of the email transporter.
 */
exports.getServiceStatus = () => {
    return transporterStatus;
};
