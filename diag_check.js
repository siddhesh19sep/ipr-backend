const mongoose = require('mongoose');
require('dotenv').config();
const IP = require('./models/IP');
const User = require('./models/User');

async function checkRecentIPs() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected for audit");

        const recentIPs = await IP.find().sort({ createdAt: -1 }).limit(3).populate('owner').populate('creators.user');
        
        recentIPs.forEach(ip => {
            console.log(`\nIP: ${ip.title}`);
            console.log(`Owner: ${ip.owner?.name || 'MISSING'}`);
            console.log(`Creators: ${ip.creators?.length || 0}`);
            ip.creators.forEach(c => {
                console.log(` - ${c.user?.name || 'UNKNOWN'}: ${c.share}%`);
            });
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkRecentIPs();
