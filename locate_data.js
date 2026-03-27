const mongoose = require('mongoose');
require('dotenv').config();

async function locateData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const admin = mongoose.connection.db.admin();
        
        // 1. List all Databases
        const dbs = await admin.listDatabases();
        console.log("📂 [DATABASES ON THIS CLUSTER]:");
        dbs.databases.forEach(db => console.log(`   - ${db.name} (${db.sizeOnDisk} bytes)`));

        // 2. Check the current database (from URI)
        const currentDbName = mongoose.connection.db.databaseName;
        console.log(`\n🔗 [CURRENT CONNECTION]: ${currentDbName}`);

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📚 [COLLECTIONS IN '${currentDbName}']:`);
        
        for (const col of collections) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            console.log(`   - ${col.name}: ${count} documents`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error("❌ Error locating data:", err.message);
    }
}

locateData();
