const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function verify() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const result = await User.updateMany(
            { $or: [{ username: /siddhesh/i }, { name: /siddhesh/i }, { email: /siddhesh/i }] },
            { $set: { isVerified: true } }
        );
        
        console.log(`Updated ${result.modifiedCount} users to verified.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
verify();
