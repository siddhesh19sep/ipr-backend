const mongoose = require('mongoose');
require('dotenv').config();
const IP = require('./models/IP');

async function findMockApproved() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const ips = await IP.find({ 
            status: 'Approved',
            $or: [
                { txHash: /Simulated/ },
                { txHash: /Mock/ },
                { txHash: { $exists: false } },
                { txHash: '' }
            ]
        }, 'title status txHash fileHash');
        console.log(`Approved IPs with mock/missing hashes: ${ips.length}`);
        console.log(JSON.stringify(ips, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
findMockApproved();
