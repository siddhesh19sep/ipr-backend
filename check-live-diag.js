const axios = require('axios');

async function checkLiveEmail() {
    try {
        console.log("Pinging live diagnostic email endpoint...");
        const response = await axios.post('https://ipr-backend-1-2llk.onrender.com/api/auth/test-email', {
            email: 'test@example.com'
        });
        console.log("Status:", response.status);
        console.log("Data:", response.data);
    } catch (error) {
        if (error.response) {
            console.error("Diagnostic Failed. Backend says:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Error connecting:", error.message);
        }
    }
}

checkLiveEmail();
