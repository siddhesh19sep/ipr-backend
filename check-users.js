const mongoose = require("mongoose");
require("dotenv").config();
require("./models/User");

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const User = mongoose.model("User");
        const users = await User.find({}, 'name username email role');
        console.log("Registered Users in DB:");
        users.forEach(u => {
            console.log(`Name: '${u.name}', Username: '${u.username}', Email: '${u.email}'`);
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkUsers();
