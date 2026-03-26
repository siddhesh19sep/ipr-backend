const mongoose = require('mongoose');
require('dotenv').config();
const IP = require('./models/IP');

async function listPending() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const ips = await IP.find({ status: 'Pending' }, 'title');
        console.log(JSON.stringify(ips, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
listPending();
