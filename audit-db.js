const mongoose = require('mongoose');
require('dotenv').config();
const Transaction = require('./models/Transaction');
const IP = require('./models/IP');

async function audit() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('--- DATABASE AUDIT ---');

        const newestIP = await IP.findOne().sort({ createdAt: -1 });
        const oldestIP = await IP.findOne().sort({ createdAt: 1 });
        const txCount = await Transaction.countDocuments({ type: 'Platform Income' });

        console.log(`NEWEST_IP: ${newestIP ? newestIP.createdAt : 'NONE'}`);
        console.log(`OLDEST_IP: ${oldestIP ? oldestIP.createdAt : 'NONE'}`);
        console.log(`PLATFORM_INCOME_TXS: ${txCount}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
audit();
