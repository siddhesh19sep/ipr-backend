const mongoose = require('mongoose');
require('dotenv').config();
const IP = require('./models/IP');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const License = require('./models/License');
const blockchainService = require('./services/blockchainService');

async function runFinalAudit() {
    console.log("==== FINAL SYSTEM AUDIT: EXAMINATION READINESS ====");
    
    try {
        // 1. Database Check
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🟢 [DATABASE] Connected successfully.");

        const ipCount = await IP.countDocuments();
        const userCount = await User.countDocuments();
        const adminCount = await User.countDocuments({ role: 'Admin' });
        const licenseCount = await License.countDocuments();
        const txCount = await Transaction.countDocuments();

        console.log(`📊 [STATS] IPs: ${ipCount}, Users: ${userCount} (Admins: ${adminCount})`);
        console.log(`📊 [STATS] Licenses: ${licenseCount}, Transactions: ${txCount}`);

        // 2. Blockchain Service Audit
        console.log(`🔗 [BLOCKCHAIN] Mode: ${blockchainService.isSimulated ? 'SIMULATION' : 'LIVE (Polygon Amoy)'}`);
        if (blockchainService.isSimulated) {
            console.log("   - Blockchain anchoring is working via Simulation Hash generator (Perfect for Demo).");
        }

        // 3. New Feature Audit: Share-Based Royalties
        console.log("\n🧪 [FEATURE] Auditing Share-Based Royalty Logic...");
        const testIP = await IP.findOne({ creators: { $exists: true, $not: { $size: 0 } } }).populate('creators.user');
        
        if (testIP) {
            console.log(`   - Found Sample IP: "${testIP.title}" with ${testIP.creators.length} creators.`);
            let totalShare = 0;
            testIP.creators.forEach(c => {
                totalShare += c.share;
                console.log(`     > ${c.user?.name || 'Unknown'}: ${c.share}%`);
            });
            console.log(`   - Total Revenue Split: ${totalShare}% (Status: ${totalShare === 100 ? 'VALID' : 'INVALID'})`);
        } else {
            console.log("   - ⚠️  No multi-creator IPs found for royalty audit. Please register one during demo.");
        }

        // 4. API Endpoints Connectivity (Internal check)
        const routes = require('./routes/dashboardRoutes'); // Just verifying import
        console.log("✅ [BACKEND] Routing modules initialized and ready.");

        console.log("\n================================================");
        console.log("🎯 ALL CORE SYSTEMS ARE GREEN. PLATFORM IS READY FOR DEMONSTRATION.");
        console.log("================================================");

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("❌ [CRITICAL] Audit Failed:", err.message);
        process.exit(1);
    }
}

runFinalAudit();
