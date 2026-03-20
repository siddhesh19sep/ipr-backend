const mongoose = require('mongoose');
require('dotenv').config();
const IP = require('./models/IP');
const Transaction = require('./models/Transaction');
const User = require('./models/User');

async function backfill() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to Database');

        const adminUser = await User.findOne({ role: 'Admin' });
        if (!adminUser) {
            console.error('Admin user not found! Please ensure Siddhesh Kanse is the Admin.');
            process.exit(1);
        }

        const ips = await IP.find();
        console.log(`Found ${ips.length} IPs to process.`);

        let processed = 0;
        let created = 0;

        for (const ip of ips) {
            processed++;
            // Check if Registration Fee already exists for this IP
            const existingTx = await Transaction.findOne({ asset: ip._id, type: 'Registration Fee' });
            
            if (!existingTx) {
                const registrationCost = 2500; // Standard cost
                const timestamp = ip.createdAt || new Date();

                // 1. Registration Fee (Debit User)
                await Transaction.create({
                    txId: `BACK-FE-${ip._id}-${Date.now()}`,
                    asset: ip._id,
                    assetTitle: ip.title,
                    type: "Registration Fee",
                    amount: -registrationCost,
                    status: "Completed",
                    recipient: ip.owner,
                    createdAt: timestamp
                });

                // 2. Platform Income (Credit Admin)
                await Transaction.create({
                    txId: `BACK-IN-${ip._id}-${Date.now()}`,
                    asset: ip._id,
                    assetTitle: ip.title,
                    type: "Platform Income",
                    amount: registrationCost,
                    status: "Credited",
                    recipient: adminUser._id,
                    createdAt: timestamp
                });

                // 3. Initial Valuation (Credit User)
                await Transaction.create({
                    txId: `BACK-VAL-${ip._id}-${Date.now()}`,
                    asset: ip._id,
                    assetTitle: ip.title,
                    type: "Usage Royalty",
                    amount: 5000,
                    status: "Credited",
                    recipient: ip.owner,
                    createdAt: timestamp
                });

                created++;
            }
        }

        console.log(`Process Complete. Checked ${processed} IPs. Created transaction sets for ${created} IPs.`);
        process.exit(0);
    } catch (err) {
        console.error("BACKFILL ERROR:", err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

backfill();
