const mongoose = require("mongoose");
require("../models/User"); // Ensure model is registered
require("../models/OTP"); // Ensure model is registered
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmail, getServiceStatus } = require("../services/emailService");

// Send OTP for Registration
exports.sendOtp = async (req, res) => {
    try {
        const { email, username } = req.body;
        const User = mongoose.model("User");
        const OTP = mongoose.model("OTP");

        if (!email || !username) {
            return res.status(400).json({ message: "Email and username are required." });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: "An account with this email or username already exists." });
        }

        // Generate a 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Save or update the OTP in the database
        await OTP.findOneAndUpdate(
            { email },
            { otp: otpCode, createdAt: Date.now() },
            { upsert: true, new: true }
        );

        // Send Email
        const message = `
            <h2>Email Verification</h2>
            <p>Your one-time password (OTP) for registering at IPRChain is:</p>
            <h1 style="color: #4f46e5; letter-spacing: 5px;">${otpCode}</h1>
            <p>This code will expire in 5 minutes.</p>
        `;

        await sendEmail(
            email, 
            "Your IPRChain Verification Code", 
            `Your OTP is ${otpCode}`, 
            message
        );

        res.status(200).json({ message: "Verification code sent to your email." });

    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ error: "Failed to send verification code. Please try again." });
    }
};

// Register User
exports.register = async (req, res) => {
    try {
        const { name, username, email, password, walletAddress, otp } = req.body;
        const User = mongoose.model("User");
        const OTP = mongoose.model("OTP");

        if (!otp) {
            return res.status(400).json({ message: "Verification code is required." });
        }

        // Verify the OTP
        const otpRecord = await OTP.findOne({ email });
        if (!otpRecord) {
            return res.status(400).json({ message: "Verification code has expired or was not requested." });
        }

        if (otpRecord.otp !== otp) {
            return res.status(400).json({ message: "Invalid verification code." });
        }

        // Check again if user already exists
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({ message: "Username already exists" });
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = await User.create({
            name,
            username,
            email,
            password: hashedPassword,
            walletAddress: walletAddress,
            role: "User", // Default to User, Admins are usually set manually in DB
            isVerified: true // Set to true as they just verified using OTP
        });

        // Automatically log the user in upon successful registration
        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name, username: user.username, email: user.email, avatarUrl: user.avatarUrl },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        // Return success message and token
        res.status(201).json({
            message: "User registered and logged in successfully",
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                walletAddress: user.walletAddress,
                role: user.role,
                avatarUrl: user.avatarUrl
            }
        });

        // Delete the OTP record since it's used
        await OTP.deleteOne({ email });

    } catch (error) {
        if (error.code === 11000 && error.keyPattern && error.keyPattern.walletAddress) {
            return res.status(400).json({ message: "This wallet address is already linked to another account." });
        }
        res.status(500).json({ error: error.message });
    }
};

// Login User
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const User = mongoose.model("User");

        const user = await User.findOne({
            $or: [{ username }, { email: username }]
        });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Check if the user is verified, unless they are Kunal Roy or Siddhesh
        if (!user.isVerified) {
            const nameLower = user.name ? user.name.toLowerCase() : "";
            const usernameLower = user.username ? user.username.toLowerCase() : "";
            
            const isExempt = 
                nameLower.includes("kunal") || 
                usernameLower.includes("kunal") ||
                nameLower.includes("siddhesh") ||
                usernameLower.includes("siddhesh");

            if (!isExempt) {
                // User must be verified. Automatically generate and send OTP so they don't have to click "Send OTP".
                const OTP = mongoose.model("OTP");
                const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

                await OTP.findOneAndUpdate(
                    { email: user.email },
                    { otp: otpCode, createdAt: Date.now() },
                    { upsert: true, new: true }
                );

                const message = `
                    <h2>Email Verification Required</h2>
                    <p>Welcome back! We are upgrading our security. Please verify your email with this one-time password (OTP):</p>
                    <h1 style="color: #4f46e5; letter-spacing: 5px;">${otpCode}</h1>
                    <p>This code will expire in 5 minutes.</p>
                `;

                try {
                    await sendEmail(
                        user.email,
                        "Verify Your IPRChain Account",
                        `Your OTP is ${otpCode}`,
                        message
                    );
                } catch (e) {
                    console.error("Failed to automatically send OTP during login block:", e);
                }

                return res.status(403).json({ 
                    message: "Account not verified", 
                    requiresVerification: true, 
                    email: user.email, 
                    username: user.username 
                });
            }
        }

        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name, username: user.username, email: user.email, avatarUrl: user.avatarUrl },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                walletAddress: user.walletAddress,
                role: user.role,
                avatarUrl: user.avatarUrl
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update User Profile (Settings)
exports.updateProfile = async (req, res) => {
    try {
        const { name, username, email, walletAddress } = req.body;
        const User = mongoose.model("User");
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (name) user.name = name;
        if (username) user.username = username;
        if (email) user.email = email;
        if (walletAddress !== undefined) user.walletAddress = walletAddress; // Allow clearing wallet natively with empty string

        await user.save();

        // Generate a fresh token with the new payload
        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name, username: user.username, email: user.email, walletAddress: user.walletAddress, avatarUrl: user.avatarUrl },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Profile updated successfully",
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                walletAddress: user.walletAddress,
                avatarUrl: user.avatarUrl
            }
        });
    } catch (error) {
        if (error.code === 11000 && error.keyPattern && error.keyPattern.walletAddress) {
            return res.status(400).json({ message: "This wallet address is already linked to another account." });
        }
        res.status(500).json({ error: error.message });
    }
};

// Upload User Avatar
exports.uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file provided" });
        }

        const User = mongoose.model("User");
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.avatarUrl = "/uploads/avatars/" + req.file.filename;
        await user.save();

        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name, username: user.username, email: user.email, avatarUrl: user.avatarUrl },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Avatar uploaded successfully",
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                avatarUrl: user.avatarUrl
            },
            avatarUrl: user.avatarUrl
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        console.log(`Searching for user with email: ${email}`);
        
        const User = mongoose.model("User");
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found with this email." });
        }

        // Generate Token
        const resetToken = crypto.randomBytes(32).toString("hex");
        console.log(`Generating reset token for ${email}`);
        
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Send Email (Non-blocking background task)
        console.log(`Queueing recovery email for ${user.email}`);
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
        
        const subject = "Password Reset Request - IPR Protocol";
        const text = `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
                     `Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:\n\n` +
                     `${resetUrl}\n\n` +
                     `If you did not request this, please ignore this email and your password will remain unchanged.\n`;
        
        // Don't 'await' here so we can respond to the user immediately
        sendEmail(user.email, subject, text).catch(err => {
            console.error(`Background Email Error for ${user.email}:`, err);
        });

        res.status(200).json({ 
            message: "Recovery email has been dispatched. Please check your inbox shortly.",
            debug: {
                provider: getServiceStatus().provider,
                isReady: getServiceStatus().isReady
            }
        });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ 
            error: "Failed to process recovery request.",
            details: error.message,
            stack: error.stack 
        });
    }
};

// Get Email Service Status
exports.getEmailStatus = (req, res) => {
    try {
        const status = getServiceStatus();
        res.status(200).json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const User = mongoose.model("User");
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Password reset token is invalid or has expired." });
        }

        // Hash new password
        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: "Password has been updated successfully. You can now log in." });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ error: "Failed to reset password." });
    }
};

// Test Email Connection (Restricted)
exports.testEmail = async (req, res) => {
    try {
        const { sendEmail } = require("../services/emailService");
        const result = await sendEmail(req.body.email || "test@example.com", "IPR Protocol - Email Diagnostic", "If you see this, your SMTP configuration is 100% correct!");
        res.status(200).json({ 
            success: true, 
            message: "SMTP test successful! Check your inbox.", 
            info: result 
        });
    } catch (error) {
        console.error("Diagnostic Email Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "SMTP Test Failed", 
            error: error.message,
            code: error.code,
            command: error.command
        });
    }
};

// Verify Login OTP for Retroactive Verification
exports.verifyLogin = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const User = mongoose.model("User");
        const OTP = mongoose.model("OTP");

        if (!otp || !email) {
            return res.status(400).json({ message: "Email and Verification code are required." });
        }

        // Verify the OTP
        const otpRecord = await OTP.findOne({ email });
        if (!otpRecord) {
            return res.status(400).json({ message: "Verification code has expired or was not requested." });
        }

        if (otpRecord.otp !== otp) {
            return res.status(400).json({ message: "Invalid verification code." });
        }

        // Find user and update isVerified
        const user = await User.findOneAndUpdate(
            { email },
            { isVerified: true },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Generate token and log them in
        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name, username: user.username, email: user.email, avatarUrl: user.avatarUrl },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        // Delete the OTP record
        await OTP.deleteOne({ email });

        res.status(200).json({
            message: "Email verified and login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                walletAddress: user.walletAddress,
                role: user.role,
                avatarUrl: user.avatarUrl
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};