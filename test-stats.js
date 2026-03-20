const mongoose = require('mongoose');
require('dotenv').config();
const { getAdminStats } = require('./controllers/dashboardController');

// Mock req and res
const req = {};
const res = {
    status: (code) => ({
        json: (data) => console.log('JSON OUTPUT:', JSON.stringify(data, null, 2))
    })
};

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        await getAdminStats(req, res);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
test();
