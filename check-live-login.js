const axios = require('axios');

async function testLogin() {
    try {
        console.log("Attempting to login to the live API...");
        const response = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'unverified@test.com',
            password: 'password123'
        });
        
        console.log("Success! You bypassed verification.");
        console.log("Data:", response.data);
    } catch (error) {
        if (error.response) {
            console.log("Status:", error.response.status);
            console.log("Data:", error.response.data);
            if (error.response.data.requiresVerification) {
                console.log("✅ API PROPERLY BLOCKED LOGIN AND REQUESTED OTP!");
            }
        } else {
            console.error("No response:", error.message);
        }
    }
}

testLogin();
