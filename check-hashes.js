const mongoose = require('mongoose');
require('dotenv').config();
const IP = require('./models/IP');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const ips = await IP.find();
        console.log(`Checking ${ips.length} IP records...`);

        const realHashes = ips.filter(ip => ip.txHash && !ip.txHash.startsWith('0xSimulated'));
        
        if (realHashes.length > 0) {
            console.log(`Found ${realHashes.length} records with potential real blockchain hashes:`);
            realHashes.forEach(ip => {
                console.log(`- Title: ${ip.title}, Hash: ${ip.txHash}`);
            });
        } else {
            console.log("No real (non-simulated) blockchain transaction hashes found.");
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
