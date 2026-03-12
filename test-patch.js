
const mongoose = require('mongoose');

async function test() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/iprchain');
        console.log('Connected to MongoDB V2');
        
        const db = mongoose.connection.db;
        const users = await db.collection('users').find({}).toArray();
        let updatedCount = 0;
        
        for (const u of users) {
             console.log('User:', u.email, '| Username:', u.username);
             
             if (!u.username && u.email) {
                 const generated = u.email.split('@')[0];
                 
                 const updateOp = {};
                 updateOp[String.fromCharCode(36) + 'set'] = { username: generated };
                 
                 await db.collection('users').updateOne({ _id: u._id }, updateOp);
                 
                 console.log('-> Patched missing username:', generated);
                 updatedCount++;
             }
        }
        
        console.log('Patched ' + updatedCount + ' legacy users.');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

test();

