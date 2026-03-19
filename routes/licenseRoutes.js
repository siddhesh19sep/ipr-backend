const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { purchaseLicense, getMyLicenses, getAssetLicenses } = require("../controllers/licenseController");

// All license routes require authentication
router.use(authMiddleware);

router.post("/purchase", purchaseLicense);
router.get("/my-licenses", getMyLicenses);
router.get("/asset/:ipId", getAssetLicenses);

module.exports = router;
