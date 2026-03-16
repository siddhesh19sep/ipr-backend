const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmail } = require("../services/emailService");

// Register User
exports.register = async (req, res) => {
    try {
        const { name, username, email, password, walletAddress } = req.body;

        // Check if user already exists
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
            role: "User" // Default to User, Admins are usually set manually in DB
        });

        // Automatically log the user in upon successful registration
        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name, username: user.username, email: user.email, avatarUrl: user.avatarUrl },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

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

        // Send Email
        console.log(`Attempting to send recovery email to ${user.email}`);
        const resetUrl = `https://ipr-frontend-lovat.vercel.app/reset-password/${resetToken}`;
        
        const subject = "Password Reset Request - IPR Protocol";
        const text = `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
                     `Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:\n\n` +
                     `${resetUrl}\n\n` +
                     `If you did not request this, please ignore this email and your password will remain unchanged.\n`;
        
        await sendEmail(user.email, subject, text);
        console.log(`Recovery email status: Dispatched for ${user.email}`);

        res.status(200).json({ message: "Recovery email sent successfully." });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ error: "Failed to process recovery request." });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

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