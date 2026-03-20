const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function setupAdmin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        // 1. Demote everyone to 'Creator'
        const demoteResult = await mongoose.connection.db.collection('users').updateMany(
            {}, 
            { $set: { role: 'Creator' } }
        );
        console.log(`Demoted ${demoteResult.modifiedCount} users to Creator.`);

        // 2. Promote "Siddhesh Kanse" to 'Admin'
        // Using regex for case-insensitive and flexibility
        const promoteResult = await mongoose.connection.db.collection('users').updateOne(
            { name: { $regex: /^Siddhesh Kanse$/i } },
            { $set: { role: 'Admin' } }
        );

        if (promoteResult.matchedCount > 0) {
            console.log("Successfully promoted 'Siddhesh Kanse' to Admin.");
        } else {
            console.log("User 'Siddhesh Kanse' not found! Please check the exact name in the database.");
            
            // Helpful: list all users so I can see what names exist
            const users = await mongoose.connection.db.collection('users').find({}, { projection: { name: 1, email: 1 } }).toArray();
            console.log("Available users in DB:");
            users.forEach(u => console.log(`- ${u.name} (${u.email})`));
        }

        process.exit(0);
    } catch (err) {
        console.error("Error setting up admin:", err);
        process.exit(1);
    }
}

setupAdmin();
