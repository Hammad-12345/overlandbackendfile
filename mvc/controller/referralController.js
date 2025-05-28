const Referral = require("../model/referralModel");
const User = require("../model/usermodel");
const crypto = require("crypto");

// Generate a unique referral code
const generateReferralCode = () => {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
};

// Get or create referral data for a user
const getReferralData = async (req, res) => {
  try {
    const userId = req.userId; // Assuming you have user data in req.user from auth middleware

    let referralData = await Referral.findOne({ userId });

    if (!referralData) {
      // Create new referral data if it doesn't exist
      const referralCode = generateReferralCode();
      referralData = await Referral.create({
        userId,
        referralCode,
      });
    }

    // If there are referred users, fetch their creation times
    let referredUsersData = [];
    if (referralData.referredTo && referralData.referredTo.length > 0) {
      referredUsersData = await User.find(
        { EmailAddress: { $in: referralData.referredTo } },
        { EmailAddress: 1, createdAt: 1 }
      );
    }

    res.json({
      referralCode: referralData.referralCode,
      stats: {
        totalReferrals: referralData.totalReferrals,
        successfulReferrals: referralData.successfulReferrals,
        referredTo: referredUsersData.map((user) => ({
          email: user.EmailAddress,
          createdAt: user.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error in getReferralData:", error);
    res.status(500).json({ error: "Failed to fetch referral data" });
  }
};

// Process a new referral
const processReferral = async (req, res) => {
  try {
    const { referralCode } = req.body;
    const newUserId = req.user._id;

    // Find the referrer
    const referrer = await Referral.findOne({ referralCode });
    if (!referrer) {
      return res.status(400).json({ error: "Invalid referral code" });
    }

    // Check if user was already referred
    const existingReferral = await Referral.findOne({ userId: newUserId });
    if (existingReferral) {
      return res.status(400).json({ error: "User already has a referral" });
    }

    // Create new referral record for the new user
    await Referral.create({
      userId: newUserId,
      referralCode: generateReferralCode(),
      referredBy: referrer.userId,
    });

    // Update referrer's stats
    referrer.totalReferrals += 1;
    referrer.pendingReferrals += 1;
    await referrer.save();

    res.json({ message: "Referral processed successfully" });
  } catch (error) {
    console.error("Error in processReferral:", error);
    res.status(500).json({ error: "Failed to process referral" });
  }
};

module.exports = {
  getReferralData,
  processReferral,
};
