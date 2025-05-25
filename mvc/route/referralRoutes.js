const express = require('express');
const router = express.Router();
const { getReferralData, processReferral } = require('../controller/referralController');
const { verifyToken } = require('../middleware/auth'); // Updated middleware name

// Get user's referral data
router.get('/referral-data', verifyToken, getReferralData);

// Process a new referral
router.post('/process-referral', verifyToken, processReferral);

module.exports = router; 