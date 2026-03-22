const express = require("express");
const router = express.Router();
const { register, login, updateProfile, uploadAvatar, forgotPassword, resetPassword, testEmail, getEmailStatus, sendOtp, verifyLogin } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

// Configure Multer for Avatar Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/avatars/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Authentication routes
router.post("/send-otp", sendOtp);
router.post("/register", register);
router.post("/login", login);
router.post("/verify-login", verifyLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/test-email", testEmail);
router.get("/email-status", getEmailStatus);

// Protected routes
router.put("/profile", authMiddleware, updateProfile);
router.post("/upload-avatar", authMiddleware, upload.single("avatar"), uploadAvatar);

module.exports = router;