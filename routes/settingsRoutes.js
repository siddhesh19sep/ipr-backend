const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Get global pricing (Open to any authenticated user during Registration)
router.get('/pricing', authMiddleware, settingsController.getPricingMatrix);

// Update global pricing (Strictly limited to Admins)
router.put('/pricing', authMiddleware, roleMiddleware(['Admin']), settingsController.updatePricingMatrix);

module.exports = router;
