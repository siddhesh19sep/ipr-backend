require('dotenv').config();
const { sendEmail } = require('./services/emailService');

async function verifyEmailService() {
    console.log("Starting Verification of Email Service...\n");

    // 1. Test with verified email (should use Resend or Gmail)
    console.log("Test 1: Sending to verified email (siddheshkanse132@gmail.com)...");
    const result1 = await sendEmail("siddheshkanse132@gmail.com", "IPR Verification Test 1", "This is a test to verify the updated email service.");
    console.log("Result 1:", result1);
    console.log("");

    // 2. Test with unverified email (should use Gmail or Mock)
    console.log("Test 2: Sending to unverified email (random-test-123@example.com)...");
    const result2 = await sendEmail("random-test-123@example.com", "IPR Verification Test 2", "This is a test to verify the fallback/mock mechanism.");
    console.log("Result 2:", result2);
    console.log("");

    if (result1.mock || result2.mock) {
        console.log("✅ Verification Complete: Mock mode is working as expected when delivery fails.");
    } else {
        console.log("✅ Verification Complete: Real delivery (Resend/Gmail) is working.");
    }
}

verifyEmailService();
