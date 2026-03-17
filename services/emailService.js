const nodemailer = require("nodemailer");

let transporter;

/**
 * Initializes the email transporter.
 * Prioritizes real SMTP credentials from environment variables.
 * Falls back to Ethereal (mock) if no credentials are found.
 */
const initializeTransporter = async () => {
    // Check for real SMTP credentials in .env
    const isRealSMTP = process.env.EMAIL_USER && process.env.EMAIL_PASS;

    if (isRealSMTP) {
        console.log(`Initializing Real SMTP Service for: ${process.env.EMAIL_USER}`);
        transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465, // Trying 465 again but with verification
            secure: true, 
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            debug: true,
            logger: true
        });

        // Verify connection immediately
        transporter.verify((error, success) => {
            if (error) {
                console.error("SMTP Verification Failed:", error);
            } else {
                console.log("SMTP Server is ready to take our messages");
            }
        });
    } else {
        console.log("No SMTP credentials found. Initializing Mock Email Service (Ethereal)...");
        try {
            const account = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: account.smtp.host,
                port: account.smtp.port,
                secure: account.smtp.secure,
                auth: {
                    user: account.user,
                    pass: account.pass
                }
            });
            console.log("Mock Email Service initialized. Emails will NOT reach real inboxes.");
        } catch (err) {
            console.error("Failed to initialize Mock Email Service:", err.message);
        }
    }
};

// Initialize on load
initializeTransporter();

/**
 * Sends an email using the initialized transporter.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email Subject
 * @param {string} text - Plaintext email body
 * @param {string} html - HTML email body (optional)
 */
exports.sendEmail = async (to, subject, text, html = "") => {
    // Wait a brief moment if transporter is still initializing
    if (!transporter) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!transporter) {
        throw new Error("Email service is unavailable.");
    }

    try {
        const info = await transporter.sendMail({
            from: `"IPR Protocol Support" <${process.env.EMAIL_USER || 'noreply@iprprotocol.dev'}>`,
            to,
            subject,
            text,
            html: html || text
        });

        console.log(`Email sent to ${to} | Provider: ${process.env.EMAIL_USER ? 'SMTP' : 'Mock'}`);
        
        if (!process.env.EMAIL_USER) {
            console.log("Email Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }
        
        return info;
    } catch (error) {
        console.error("Critical Email Error:", error);
        throw error;
    }
};
