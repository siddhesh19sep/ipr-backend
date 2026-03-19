const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { globalSearch } = require("../controllers/searchController");

// Protect search route
router.use(authMiddleware);

router.get("/global", globalSearch);

module.exports = router;
