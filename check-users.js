const mongoose = require('mongoose');

require('dotenv').config();
const MONGO_URI = process.env.MONGO_URI;

async function checkUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB successfully!");
    
    // We don't have the exact model file imported easily, but we can access the collection directly
    const db = mongoose.connection.useDb('test');
    const users = await db.db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users in 'test' database:`);
    users.forEach(u => {
      console.log(`- Username: ${u.username} | Email: ${u.email}`);
    });

  } catch (error) {
    console.error("Error connecting or querying:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUsers();
