const nodemailer = require('nodemailer');
require('dotenv').config();

const GMAIL_USER = process.env.EMAIL_USER;
const GMAIL_PASS = process.env.EMAIL_PASS;

async function testGmail() {
    console.log("--- GMAIL SMTP DIAGNOSTIC ---");
    console.log(`User: ${GMAIL_USER}`);
    console.log(`Pass: ${GMAIL_PASS ? '******** (Hidden)' : 'MISSING'}`);

    if (!GMAIL_USER || !GMAIL_PASS) {
        console.error("❌ GMAIL CREDENTIALS MISSING IN .env");
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_PASS,
        },
    });

    try {
        console.log("Testing connection...");
        await transporter.verify();
        console.log("✅ GMAIL CONNECTION SUCCESSFUL!");

        console.log("Sending test email...");
        const info = await transporter.sendMail({
            from: `"IPR Diagnostic" <${GMAIL_USER}>`,
            to: GMAIL_USER, // Send to self
            subject: "IPR Platform - SMTP Test",
            text: "If you receive this, your Gmail App Password is correct and perfectly working!",
        });
        console.log("✅ TEST EMAIL SENT! Message ID:", info.messageId);
    } catch (err) {
        console.error("❌ GMAIL TEST FAILED!");
        console.error("Error Message:", err.message);
        console.error("Code:", err.code);
        
        if (err.message.includes("Invalid login")) {
            console.warn("\n💡 TIP: 'Invalid login' usually means:");
            console.warn("1. You didn't enable 2FA on your Google Account.");
            console.warn("2. You aren't using an 'App Password'. (Go to Google Account -> Security -> App Passwords)");
        }
    }
}

testGmail();
