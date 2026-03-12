const nodemailer = require("nodemailer");

let transporter;

// Asynchronously initialize an Ethereal test account for development purposes
// In production, you would replace this with actual SMTP credentials (e.g., SendGrid, Gmail)
nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error("Failed to create a testing account. " + err.message);
        return;
    }

    // Create a reusable transporter object using the default SMTP transport
    transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
            user: account.user,
            pass: account.pass
        }
    });

    console.log("Mock Email Service (Nodemailer/Ethereal) initialized successfully.");
});

/**
 * Sends an email using the initialized transporter.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email Subject
 * @param {string} text - Plaintext email body
 * @param {string} html - HTML email body (optional)
 */
exports.sendEmail = async (to, subject, text, html = "") => {
    if (!transporter) {
        console.warn("Email transporter not yet initialized. Skipping email send.");
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: '"IPR Protocol Auth" <noreply@iprprotocol.dev>',
            to,
            subject,
            text,
            html: html || text
        });

        console.log(`Email dispatched to ${to} | Subject: ${subject}`);
        // Preview only available when sending through an Ethereal account
        console.log("Email Preview URL: %s", nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error("Error sending email: ", error);
    }
};
