const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
    await mongoose.connection.db.collection('users').updateMany({}, { $set: { role: 'Admin' } });
    console.log('All users promoted to Admin');
    process.exit(0);
});
