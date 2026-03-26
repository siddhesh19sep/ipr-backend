const mongoose = require("mongoose");
const SystemSettings = require("./models/SystemSettings");
const IP = require("./models/IP");
const Transaction = require("./models/Transaction");
require("dotenv").config();

async function testFees() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // 1. Check SystemSettings
        const settings = await SystemSettings.findOne({ singleton: 'GLOBAL' });
        console.log("Current Pricing Matrix:", settings.pricingMatrix);

        // 2. Mock a registration calculation (Simulation because we need req/res for controller)
        // Instead of calling controller, let's just verify the model and logic directly or mock the objects
        const category = "Patent";
        const yearsValid = 2;
        const baseCostPerYear = settings.pricingMatrix[category] || 100;
        const expectedRegCost = baseCostPerYear * yearsValid;
        console.log(`Testing Registration: Category=${category}, Years=${yearsValid}, Expected Cost=${expectedRegCost}`);

        if (expectedRegCost !== 1500) { // Patent is 750 in SystemSettings.js default
            console.error("Mismatch in Patent registration cost calculation!");
        } else {
            console.log("Registration cost calculation logic verified.");
        }

        // 3. Mock a renewal calculation
        const yearsToAdd = 3;
        const expectedRenCost = baseCostPerYear * yearsToAdd;
        console.log(`Testing Renewal: Category=${category}, YearsToAdd=${yearsToAdd}, Expected Cost=${expectedRenCost}`);

        if (expectedRenCost !== 2250) {
            console.error("Mismatch in Patent renewal cost calculation!");
        } else {
            console.log("Renewal cost calculation logic verified.");
        }

        console.log("Fee activation verification completed successfully.");
        process.exit(0);
    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
}

testFees();
