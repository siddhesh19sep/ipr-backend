const axios = require('axios');

async function testRoute() {
    try {
        console.log("Pinging new route /verify-login...");
        const response = await axios.post('https://ipr-backend-1-2llk.onrender.com/api/auth/verify-login', {});
        console.log("Response Status:", response.status);
    } catch (error) {
        if (error.response) {
            console.log("Response Status:", error.response.status);
        } else {
            console.error("Error:", error.message);
        }
    }
}

testRoute();
