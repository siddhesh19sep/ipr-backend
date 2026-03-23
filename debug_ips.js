const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const IP = require('./models/IP');
        const ips = await IP.find().select('title gridFsId fileData fileHash status createdAt').sort({createdAt: -1}).limit(5);
        
        console.log("Checking last 5 IPs:");
        ips.forEach(ip => {
            const obj = ip.toObject();
            console.log(`Title: ${obj.title}`);
            console.log(`ID: ${obj._id}`);
            console.log(`Created: ${obj.createdAt}`);
            console.log(`gridFsId: ${obj.gridFsId}`);
            console.log(`fileData Content: ${obj.fileData ? obj.fileData.substring(0, 30) + '...' : 'null'}`);
            console.log(`fileHash: ${obj.fileHash}`);
            console.log(`---`);
        });
        
        const db = mongoose.connection.db;
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'ip_documents' });
        const files = await bucket.find().sort({uploadDate: -1}).limit(5).toArray();
        console.log("Last 5 files in GridFS:");
        console.log(JSON.stringify(files, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
