const mongoose = require('mongoose');
require('dotenv').config();
const IP = require('./models/IP');
const Transaction = require('./models/Transaction');
const User = require('./models/User');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to Atlas DB');

        const ipCount = await IP.countDocuments();
        const txCount = await Transaction.countDocuments();
        const platformIncomeCount = await Transaction.countDocuments({ type: 'Platform Income' });
        
        console.log(`Total IPs: ${ipCount}`);
        console.log(`Total Transactions: ${txCount}`);
        console.log(`Platform Income Transactions: ${platformIncomeCount}`);

        if (platformIncomeCount === 0 && ipCount > 0) {
            console.log('CRITICAL: No Platform Income transactions found! Dashboards will show 0 revenue.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
