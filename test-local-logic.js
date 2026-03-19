require("dotenv").config();
const mongoose = require("mongoose");
const { sendOtp } = require("./controllers/authController");

async function testOtpLogic() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected.");
        
        // Mock Express Req & Res
        const req = {
            body: {
                email: 'testuser123@example.com',
                username: 'testuser123'
            }
        };
        
        const res = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                console.log(`Response Status: ${this.statusCode}`);
                console.log("Response Data:", data);
            }
        };

        console.log("Calling sendOtp handler...");
        await sendOtp(req, res);
        
        console.log("Test execution completed.");
        process.exit(0);
    } catch (error) {
        console.error("Test Failed:", error);
        process.exit(1);
    }
}

testOtpLogic();
