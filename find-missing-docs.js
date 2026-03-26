const mongoose = require('mongoose');
require('dotenv').config();
const IP = require('./models/IP');

async function findMissingDocs() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const ips = await IP.find({
            $or: [
                { fileData: { $exists: false } },
                { fileData: '' },
                { fileData: 'LARGE_FILE_STORED_IN_GRIDFS', gridFsId: { $exists: false } }
            ]
        }, 'title owner status');
        console.log(`IPs with missing documents: ${ips.length}`);
        console.log(JSON.stringify(ips, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
findMissingDocs();
