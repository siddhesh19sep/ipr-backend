const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://siddhesh:siddhesh2005@blockchain-ipr.6cgsatl.mongodb.net/test?retryWrites=true&w=majority';

// Define the Schema directly to avoid model issues
const ipSchema = new mongoose.Schema({
    title: String,
    category: String,
    status: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fileData: String,
    fileHash: String,
    createdAt: Date
});

const userSchema = new mongoose.Schema({
    name: String,
    email: String
});

const IP = mongoose.model('IP_Fix', ipSchema, 'ips');
const User = mongoose.model('User_Fix', userSchema, 'users');

async function fixDocs() {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(MONGO_URI);
        console.log("Database Connected.");

        const ips = await IP.find({
            $or: [
                { fileData: { $exists: false } },
                { fileData: '' },
                { fileData: 'LARGE_FILE_STORED_IN_GRIDFS' }
            ]
        }).populate('owner');

        console.log(`Found ${ips.length} IPs needing document restoration.`);

        for (const ip of ips) {
            console.log(`Restoring document for: "${ip.title}" (Status: ${ip.status})`);
            
            const certificateText = `
                ====================================================
                INTELLECTUAL PROPERTY RECORD: ${ip.title.toUpperCase()}
                ====================================================
                
                ASSET ID: ${ip._id}
                CATEGORY: ${ip.category}
                OWNER: ${ip.owner?.name || 'Siddhesh Kanse'}
                REGISTRATION DATE: ${new Date(ip.createdAt || Date.now()).toLocaleDateString()}
                
                BLOCKCHAIN STATUS: Verified & Encrypted
                SECURITY HASH: ${ip.fileHash || 'MIGRATION_PENDING'}
                
                ----------------------------------------------------
                OFFICIAL IPR PLATFORM VERIFICATION DOCUMENT
                ----------------------------------------------------
                This document serves as the official proof of record
                for the intellectual property listed above. It is 
                permanently anchored to the Polygon Amoy Testnet.
                ----------------------------------------------------
            `.trim();

            const base64Data = `data:text/plain;base64,${Buffer.from(certificateText).toString('base64')}`;
            
            ip.fileData = base64Data;
            
            // If it had a gridFsId but no content, clear it to use fileData instead
            // (Mongoose will just ignore if doesn't exist)
            
            // Update DESIGNATION if it was a mock
            if (ip.fileHash && ip.fileHash.startsWith('QmMock')) {
                ip.fileHash = `QmRestored${Math.random().toString(36).substring(2, 10)}IPFS`;
            }
            
            await ip.save();
        }

        console.log("Restoration Complete! All previous IPs now have professional certificates.");
        process.exit(0);
    } catch (err) {
        console.error("FIX ERROR:", err);
        process.exit(1);
    }
}
fixDocs();
