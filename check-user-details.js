const mongoose = require('mongoose');
require('dotenv').config();

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
    
    const db = mongoose.connection.useDb('test');
    const user = await db.db.collection('users').findOne({ email: 'siddheshkanse132@gmail.com' });
    
    if (user) {
        console.log("USER DATA FOUND:");
        console.log(JSON.stringify(user, null, 2));
    } else {
        console.log("USER NOT FOUND");
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUser();
