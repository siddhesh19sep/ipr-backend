const axios = require('axios');

const RESEND_API_KEY = "re_ehi3SAUC_6p3BraG9KkRppCEWJ5ngi8dr";

async function testResend() {
    try {
        console.log("Testing Resend API...");
        const response = await axios.post('https://api.resend.com/emails', {
            from: "IPR Secure Authentication <onboarding@resend.dev>",
            to: ["siddheshkanse132@gmail.com"],
            subject: "Resend Test",
            html: "<p>If you see this, the Resend API key is valid.</p>"
        }, {
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log("Success! ID:", response.data.id);
    } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}

testResend();
