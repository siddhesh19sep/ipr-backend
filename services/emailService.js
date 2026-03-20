const nodemailer = require("nodemailer");

let transporter;
let transporterStatus = {
    provider: "Initializing",
    isReady: false,
    error: null,
    user: null
};

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
        transporterStatus.provider = "SMTP";
        transporterStatus.user = process.env.EMAIL_USER.replace(/(.{3}).*(@.*)/, "$1***$2"); // Mask email

        transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            },
            connectionTimeout: 10000, // Fail fast if blocked
            greetingTimeout: 10000,
            socketTimeout: 20000,
            debug: true,
            logger: true
        });

        // Verify connection immediately
        transporter.verify((error, success) => {
            if (error) {
                console.error("SMTP Verification Failed:", error);
                transporterStatus.isReady = false;
                transporterStatus.error = error.message;
            } else {
                console.log("SMTP Server is ready to take our messages");
                transporterStatus.isReady = true;
                transporterStatus.error = null;
            }
        });
    } else {
        console.log("No SMTP credentials found. Initializing Mock Email Service (Ethereal)...");
        transporterStatus.provider = "Mock";
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
            transporterStatus.isReady = true;
            transporterStatus.user = account.user;
            console.log("Mock Email Service initialized. Emails will NOT reach real inboxes.");
        } catch (err) {
            console.error("Failed to initialize Mock Email Service:", err.message);
            transporterStatus.isReady = false;
            transporterStatus.error = err.message;
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

/**
 * Returns the current status of the email transporter.
 */
exports.getServiceStatus = () => {
    return transporterStatus;
};
