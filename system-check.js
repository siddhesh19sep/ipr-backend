// c:\Blockchain-IPR project\backend\system-check.js
const axios = require('axios');
const fs = require('fs');

const API_URL = 'https://ipr-backend-u4al.onrender.com/api';

async function runDiagnostics() {
    console.log("🚀 Running Diagnostics...");
    const results = [];

    const runTest = async (name, testFn) => {
        const result = { name, status: 'PASSED', error: null };
        try {
            await testFn();
        } catch (error) {
            result.status = 'FAILED';
            result.error = error.response ? {
                status: error.response.status,
                data: error.response.data
            } : error.message;
        }
        results.push(result);
        console.log(`[${result.status}] ${name}`);
    };

    await runTest("Backend Reachability", async () => {
        await axios.get(`${API_URL}/ip/recent`);
    });

    await runTest("Resend API Dispatcher", async () => {
        await axios.post(`${API_URL}/auth/send-otp`, { 
            email: "siddheshkanse132@gmail.com", 
            isLogin: true 
        });
    });

    await runTest("Razorpay Order Engine", async () => {
        await axios.post(`${API_URL}/payments/create-order`, { amount: 500 });
    });

    fs.writeFileSync('diag_results.json', JSON.stringify(results, null, 2));
    console.log("Done. Results saved to diag_results.json");
}

runDiagnostics();
