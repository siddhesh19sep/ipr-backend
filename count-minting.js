const mongoose = require('mongoose');
require('dotenv').config();
const IP = require('./models/IP');

async function count() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const count = await IP.countDocuments({ 
            status: 'Approved', 
            $or: [
                { txHash: { $exists: false } }, 
                { txHash: '' }, 
                { txHash: /Simulated/ }, 
                { txHash: /Mock/ }
            ] 
        });
        console.log(`IPs needing real minting: ${count}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
count();
