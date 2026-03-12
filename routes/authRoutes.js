const express = require("express");
const router = express.Router();
const { register, login, updateProfile, uploadAvatar } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/avatars/");
    },
    filename: function (req, file, cb) {
        // Construct unique avatar filename bound to their user ID
        cb(null, req.user.id + "-" + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Authentication routes
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.put("/profile", authMiddleware, updateProfile);
router.post("/avatar", authMiddleware, upload.single("avatar"), uploadAvatar);

module.exports = router;