const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function fixRoles() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        // Set all non-Admin users to 'User' (matching frontend checks)
        const fixResult = await mongoose.connection.db.collection('users').updateMany(
            { role: { $ne: 'Admin' } }, 
            { $set: { role: 'User' } }
        );
        console.log(`Updated ${fixResult.modifiedCount} users to 'User' role.`);

        process.exit(0);
    } catch (err) {
        console.error("Error fixing roles:", err);
        process.exit(1);
    }
}

fixRoles();
