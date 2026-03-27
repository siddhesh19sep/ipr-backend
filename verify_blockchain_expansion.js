const mongoose = require('mongoose');
require('dotenv').config();
const IP = require('./models/IP');
const Transaction = require('./models/Transaction');
const License = require('./models/License');
const blockchainService = require('./services/blockchainService');
const crypto = require('crypto');

async function verifyExpansion() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB for Verification");

        const testEventHash = crypto.createHash('sha256').update('VERIFICATION-EVENT-' + Date.now()).digest('hex');
        
        console.log("\n1. Testing recordOnChainEvent (Polygon Anchoring)...");
        const polygonTxHash = await blockchainService.recordOnChainEvent(testEventHash);
        console.log(`   - Received Polygon Tx Hash: ${polygonTxHash}`);

        if (polygonTxHash) {
            console.log("\n2. Testing Database Model persistence...");
            
            // Create a mock transaction to test the new field
            const mockTx = new Transaction({
                txId: `VERIFY-TX-${Date.now()}`,
                type: "Usage Royalty",
                amount: 500,
                status: "Completed",
                recipient: new mongoose.Types.ObjectId(), // Mock User ID
                asset: new mongoose.Types.ObjectId(), // Mock Asset ID
                assetTitle: "Verification Asset",
                blockchainTxHash: polygonTxHash
            });

            await mockTx.save();
            console.log(`   - Mock Transaction saved with blockchainTxHash: ${mockTx.blockchainTxHash}`);

            // Cleanup
            await Transaction.deleteOne({ _id: mockTx._id });
            console.log("   - Cleanup: Mock Transaction deleted.");
            
            console.log("\n✅ ALL VERIFICATION STEPS PASSED!");
            console.log("The system is now capable of anchoring Royalties and Payouts to the Polygon network.");
        } else {
            console.error("❌ Verification Failed: No transaction hash returned.");
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error("❌ Verification Error:", err);
        process.exit(1);
    }
}

verifyExpansion();
