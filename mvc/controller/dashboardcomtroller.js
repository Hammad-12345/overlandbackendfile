const Deposit = require("../model/depositmodel");
const Users = require("../model/usermodel");
const bcrypt = require("bcrypt");
const Profit = require("../model/Profit");
const Notification = require("../model/notificationModel");
const ReferalEarningHistory = require("../model/ReferalEarningHistory");
const Wallet = require("../model/walletModel");
const PlanProfitToWallet = require("../model/PlanProfitToWallet");
const WithdrawRequest = require("../model/WithdrawRequest");
const Referaltowallethistory = require("../model/referaltowallethistory");

const createDeposit = async (req, res) => {
  const {
    investmentPlan,
    price,
    paymentMethod,
    depositAddress,
    screenshot,
    paymentMode,
  } = req.body;
  const userId = req.userId;
  console.log("Received deposit request body:", req.body);
  console.log("User ID:", userId);
  console.log("hy");

  try {
    // Check if user has already invested in this plan 3 times
    const existingDeposits = await Deposit.find({
      userId,
      investmentPlan,
      paymentMode:'active'
    });

    if (existingDeposits.length >= 3) {
      return res.status(201).json({
        message: `You already have 3 active plans under that investment plan. Please choose a different plan.`
      });
    }

    const deposit = await Deposit.create({
      userId,
      investmentPlan,
      price,
      paymentMethod,
      depositAddress,
      screenshot,
      paymentMode,
      referalPayment: false,
    });

    console.log("Deposit created successfully:", deposit);

    // Create notification for the user
    await Notification.create({
      userId,
      type: "investment",
      title: "New Investment",
      message: `Your investment of $${price} in ${investmentPlan} has been submitted successfully.`,
      isRead: false,
      relatedId: deposit._id,
      onModel: "Deposit",
    });

    console.log("Notification created successfully for deposit:", deposit._id);

    res.status(201).json(deposit);
  } catch (error) {
    console.error("Error creating deposit:", error);
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

const fetchUserProfits = async (req, res) => {
  const userId = req.userId;

  try {
    const profits = await Profit.find({ userId }).sort({ date: -1 });

    // Calculate total profit
    const totalProfit = profits.reduce(
      (sum, profit) => sum + (Number(profit.amount) || 0),
      0
    );

    res.status(200).json({
      profits,
      totalProfit,
    });
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
    const updatedUser = await Users.findById(userId).select("-Password -Otp");

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const fetchwalletbalance = async (req, res) => {
  const userId = req.userId;
  try {
    const wallet = await Wallet.findOne({ userId });
    const ProfitToWallet = await PlanProfitToWallet.find({ userId });
    const ReferalToWallet = await Referaltowallethistory.find({ userId });
    const WithdrawRequesthistory = await WithdrawRequest.find({ userId });
    res.status(200).json({ wallet, ProfitToWallet, ReferalToWallet, WithdrawRequesthistory });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendprofittowallet = async (req, res) => {
  try {
    const userId = req.userId;
    const { investment, profit } = req.body;
    console.log(investment)
    // Step 1: Update investment to expired
    const updatedInvestment = await Deposit.findByIdAndUpdate(
      investment._id,
      { expired: true },
      { new: true }
    );

    if (!updatedInvestment) {
      return res.status(404).json({
        message: 'Investment plan not found'
      });
    }
    const existingProfit = await Profit.findOne({ investmentId: investment._id });
    console.log(existingProfit)
    if (existingProfit) {
      // Update existing profit by adding new amount
      existingProfit.amount = 0;
      await existingProfit.save();
    }

    // Step 2: Update or create wallet with profit
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = await Wallet.create({
        userId,
        walletBalance: profit
      });
    } else {
      wallet = await Wallet.findOneAndUpdate(
        { userId },
        { $inc: { walletBalance: profit } },
        { new: true }
      );
    }

    // Step 3: Create profit transfer record
    const profitTransfer = await PlanProfitToWallet.create({
      userId,
      investmentId: investment._id,
      investmentPlan: investment.investmentPlan,
      originalAmount: investment.price,
      profitAmount: profit,
      paymentMethod: investment.paymentMethod,
      status: 'completed'
    });

    // Return success response with all updated data
    res.status(200).json({
      message: 'Profit successfully transferred to wallet',
      investment: updatedInvestment,
      wallet: wallet,
      profitTransfer: profitTransfer
    });

  } catch (error) {
    console.error("Error in sendprofittowallet:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};

const createWithdrawRequest = async (req, res) => {
  const userId = req.userId;
  const { paymentMethod, accountDetails, amount } = req.body;
  console.log(req.body)
  try {
    // Check if user has sufficient balance
    const wallet = await Wallet.findOne({ userId });
    if (!wallet || wallet.walletBalance < amount) {
      return res.status(400).json({
        message: "Insufficient balance in wallet"
      });
    }

    // Create withdraw request
    const withdrawRequest = await WithdrawRequest.create({
      userId,
      paymentMethod,
      walletAddress: accountDetails,
      amount,
      status: 'pending'
    });

    // Create notification for the user
    await Notification.create({
      userId,
      type: "withdrawal",
      title: "Withdrawal Request",
      message: `Your withdrawal request of $${amount} has been submitted successfully.`,
      isRead: false,
      relatedId: withdrawRequest._id,
      onModel: "Withdrawal",
    });

    res.status(201).json({
      message: "Withdrawal request submitted successfully",
      withdrawRequest
    });
  } catch (error) {
    console.error("Error creating withdrawal request:", error);
    res.status(500).json({ message: error.message });
  }
};

const fetchWithdrawRequests = async (req, res) => {
  const userId = req.userId;

  try {
    const withdrawRequests = await WithdrawRequest.find({ userId })
      .sort({ createdAt: -1 });
    res.status(200).json(withdrawRequests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createDeposit,
  fetchallinvestment,
  fetchUserProfits,
  updateProfile,
  fetchwalletbalance,
  sendprofittowallet,
  createWithdrawRequest,
  fetchWithdrawRequests,
};
