const mongoose = require('mongoose');

const uri = "mongodb+srv://siddhesh:siddhesh2005@blockchain-ipr.6cgsatl.mongodb.net/?retryWrites=true&w=majority";

async function checkUsers() {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB successfully!");
    
    // We don't have the exact model file imported easily, but we can access the collection directly
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({}).toArray();
    
    console.log(`Found ${users.length} users in the database.`);
    users.forEach(u => {
      console.log(`- Username: ${u.username} | Email: ${u.email} | Role: ${u.role}`);
    });

  } catch (error) {
    console.error("Error connecting or querying:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUsers();
