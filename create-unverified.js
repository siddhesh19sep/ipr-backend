const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
require("./models/User");

async function createUnverified() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const User = mongoose.model("User");
        
        const existing = await User.findOne({ email: 'unverified@test.com' });
        if (existing) {
            await User.deleteOne({ email: 'unverified@test.com' });
        }
        
        const hashedPassword = await bcrypt.hash("password123", 10);
        await User.create({
            name: "Unverified User",
            username: "unverified",
            email: "unverified@test.com",
            password: hashedPassword,
            role: "User",
            isVerified: false
        });
        
        console.log("Created unverified@test.com / password123. Try logging in locally or checking the Live DB.");
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

createUnverified();
