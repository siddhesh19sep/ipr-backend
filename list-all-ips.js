const mongoose = require('mongoose');
require('dotenv').config();
const IP = require('./models/IP');

async function list() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const ips = await IP.find({}, 'title status txHash');
        console.log(JSON.stringify(ips, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
list();
