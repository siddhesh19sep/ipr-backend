const mongoose = require('mongoose');
require('dotenv').config();
const IP = require('./models/IP');

async function findTx() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const ipWithTx = await IP.findOne({ txHash: { $exists: true, $ne: "" } });
        if (ipWithTx) {
            console.log(JSON.stringify({
                title: ipWithTx.title,
                fileHash: ipWithTx.fileHash,
                txHash: ipWithTx.txHash
            }, null, 2));
        } else {
            console.log(JSON.stringify({ error: "No IP with TxHash found" }));
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
findTx();
