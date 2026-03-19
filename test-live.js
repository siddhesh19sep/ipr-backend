const axios = require('axios');
const fs = require('fs');

async function testOtp() {
    try {
        console.log("Hitting the LIVE API...");
        const response = await axios.post('https://ipr-backend-1-2llk.onrender.com/api/auth/send-otp', {
            email: 'testuser123@example.com',
            username: 'testuser123'
        });
        fs.writeFileSync('test-otp-live.json', JSON.stringify({ status: response.status, data: response.data }));
        console.log("Success");
    } catch (error) {
        if (error.response) {
            fs.writeFileSync('test-otp-live.json', JSON.stringify({ status: error.response.status, data: error.response.data }));
        } else {
            console.log(error);
            fs.writeFileSync('test-otp-live.json', JSON.stringify({ message: error.message }));
        }
        console.log("Failed");
    }
}

testOtp();
