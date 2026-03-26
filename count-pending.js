const mongoose = require('mongoose');
require('dotenv').config();
const IP = require('./models/IP');

async function countPending() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const count = await IP.countDocuments({ status: 'Pending' });
        console.log(`Pending IPs needing approval: ${count}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
countPending();
