const axios = require('axios');

async function testBackend(url, name) {
    try {
        console.log(`\n--- Testing ${name} ---`);
        console.log(`URL: ${url}`);
        const response = await axios.get(url).catch(e => e.response || e);
        if (response.status) {
            console.log(`Status: ${response.status}`);
            console.log(`Data:`, response.data);
        } else {
            console.log(`Error: ${response.message || response}`);
        }
    } catch (error) {
        console.error(`Fatal Error with ${name}:`, error.message);
    }
}

async function run() {
    // Note: Root path for health check, not /api
    await testBackend('https://ipr-backend-u4al.onrender.com', 'u4al (api.ts)');
    await testBackend('https://ipr-backend-1-2llk.onrender.com', '1-2llk (Sidebar/Diag)');
}

run();
