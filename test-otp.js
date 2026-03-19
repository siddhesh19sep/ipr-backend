const axios = require('axios');
const fs = require('fs');

async function testOtp() {
    try {
        const response = await axios.post('http://localhost:5000/api/auth/send-otp', {
            email: 'testuser123@example.com',
            username: 'testuser123'
        });
        fs.writeFileSync('test-otp-output.json', JSON.stringify({ status: response.status, data: response.data }));
        console.log("Success");
    } catch (error) {
        if (error.response) {
            fs.writeFileSync('test-otp-output.json', JSON.stringify({ status: error.response.status, data: error.response.data }));
        } else {
            fs.writeFileSync('test-otp-output.json', JSON.stringify({ message: error.message }));
        }
        console.log("Failed");
    }
}

testOtp();
