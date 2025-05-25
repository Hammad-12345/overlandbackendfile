const Deposit = require("../model/depositmodel");
const Users = require("../model/usermodel");
const bcrypt = require("bcrypt");

const createDeposit = async (req, res) => {
  const { investmentPlan, price, paymentMethod, depositAddress, screenshot, paymentMode } = req.body;
  const userId = req.userId;
  console.log(req.body);

  try {
    const deposit = await Deposit.create({
      userId,
      investmentPlan,
      price,
      paymentMethod,
      depositAddress,
      screenshot,
      paymentMode
    });
    res.status(201).json(deposit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const fetchallinvestment = async (req, res) => {
  const userId = req.userId;

  try {
    const deposits = await Deposit.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(deposits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  const userId = req.userId;
  const { Name, profileImage } = req.body;

  try {
    // Find the user first
    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If current password is provided, validate it
    // if (currentPassword) {
    //   const isPasswordValid = await bcrypt.compare(currentPassword, user.Password);
    //   if (!isPasswordValid) {
    //     return res.status(400).json({ message: "Current password is incorrect" });
    //   }

    //   // If new password is provided, hash it
    //   if (newPassword) {
    //     const salt = await bcrypt.genSalt(10);
    //     const hashedPassword = await bcrypt.hash(newPassword, salt);
    //     user.Password = hashedPassword;
    //   }
    // }

    // Update other fields
    if (Name) user.Name = Name;
    if (profileImage) user.profileImage = profileImage;

    // Save the updated user
    await user.save();

    // Return updated user without sensitive data
    const updatedUser = await Users.findById(userId).select('-Password -Otp');
    
    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { createDeposit, fetchallinvestment, updateProfile };
