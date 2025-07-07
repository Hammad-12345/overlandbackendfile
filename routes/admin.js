const express = require('express');
const router = express.Router();
const User = require('../mvc/model/usermodel.js');
const Investment = require('../mvc/model/depositmodel.js');
const Profit = require('../mvc/model/Profit.js');
const Withdrawal = require('../mvc/model/Withdrawal.js');
const Referral = require('../mvc/model/referralModel.js');
const Notification = require('../mvc/model/notificationModel.js');
const ReferralEarningHistory = require('../mvc/model/ReferalEarningHistory.js');
const Wallet = require('../mvc/model/walletModel.js');
const PlanProfitToWallet = require("../mvc/model/PlanProfitToWallet.js");
const WithdrawRequest = require("../mvc/model/WithdrawRequest.js");
const ReferralWalletHistory = require("../mvc/model/referaltowallethistory.js");
// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ Role: 'user' });
    
    // Get total investments amount and count
    const totalInvestments = await Investment.aggregate([
      { $group: { 
        _id: null, 
        totalAmount: { $sum: '$price' },
        totalCount: { $sum: 1 }
      }}
    ]);

    // Get active investments count and amount
    const activeInvestments = await Investment.aggregate([
      { $match: { paymentMode: 'active' } },
      { $group: { 
        _id: null, 
        totalAmount: { $sum: '$price' },
        totalCount: { $sum: 1 }
      }}
    ]);

    // Get non-active investments count and amount
    const nonActiveInvestments = await Investment.aggregate([
      { $match: { paymentMode: { $ne: 'active' } } },
      { $group: { 
        _id: null, 
        totalAmount: { $sum: '$price' },
        totalCount: { $sum: 1 }
      }}
    ]);

    const totalProfits = await Profit.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const pendingWithdrawals = await WithdrawRequest.countDocuments({ status: 'pending' });

    res.json({
      totalUsers,
      totalInvestments: {
        amount: totalInvestments[0]?.totalAmount || 0,
        count: totalInvestments[0]?.totalCount || 0
      },
      activeInvestments: {
        amount: activeInvestments[0]?.totalAmount || 0,
        count: activeInvestments[0]?.totalCount || 0
      },
      nonActiveInvestments: {
        amount: nonActiveInvestments[0]?.totalAmount || 0,
        count: nonActiveInvestments[0]?.totalCount || 0
      },
      totalProfits: totalProfits[0]?.total || 0,
      pendingWithdrawals
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ Role: 'user' }).sort({ createdAt: -1 });;
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all investments
router.get('/investments', async (req, res) => {
  try {
    const investments = await Investment.find()
      .populate('userId', 'EmailAddress')
      .select('price investmentPlan paymentMode screenshot createdAt')
      .sort({ createdAt: -1 });

    // Define investment plans with their details
    const investmentPlans = {
      'Gold/Stocks': {
        dailyProfit: '1.5% to 3.5%',
        description: 'Daily profit trading plan'
      },
      'RetroDrops': {
        profit: '35% to 50% in 180 days',
        description: 'Long-term investment plan'
      },
      'Amazon': {
        monthlyProfit: '13% to 15%',
        description: 'Monthly profit trading plan'
      },
      'AirBnB': {
        monthlyProfit: '7.5% to 10%',
        description: 'Property investment plan'
      },
      'Mineral Water': {
        monthlyProfit: '8.5% to 12.5%',
        description: 'Water business investment plan'
      }
    };

    // Format the response with error checking
    const formattedInvestments = investments.map(inv => {
      // Check if userId exists before accessing its properties
      const userEmail = inv.userId ? inv.userId.EmailAddress : 'N/A';
      const userId = inv.userId ? inv.userId._id : 'N/A';
      const planDetails = investmentPlans[inv.investmentPlan] || {};

      return {
        id: inv._id,
        userId: userId,
        userEmail: userEmail,
        investmentPlan: inv.investmentPlan,
        planDetails: planDetails,
        price: inv.price || 0,
        paymentMode: inv.paymentMode || 'pending',
        createdAt: inv.createdAt || new Date(),
        screenshot: inv.screenshot || 'N/A'
      };
    });

    res.json({
      success: true,
      data: formattedInvestments,
      total: formattedInvestments.length,
      availablePlans: investmentPlans
    });
  } catch (error) {
    console.error('Error in /investments route:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Process daily profits
router.post('/process-profits', async (req, res) => {
  // console.log("hy")
  try {
    const investments = await Investment.find({ paymentMode: 'active' });
    console.log(investments)
    for (const investment of investments) {
      let dailyProfit = 0;
      
      // Calculate profit based on investment plan
      switch(investment.investmentPlan) {
        case 'Gold Trading':
          // 2.5% daily profit (average of 1.5% and 3.5%)
          dailyProfit = investment.price * 0.025;
          break;
        case 'RetroDrops':
          // 42.5% profit in 180 days (average of 35% and 50%), distributed daily
          const retroDropsDailyRate = 0.425 / 180;
          dailyProfit = investment.price * retroDropsDailyRate;
          break;
        case 'Amazon':
          // 14% monthly profit (average of 13% and 15%), distributed daily
          const amazonDailyRate = 0.14 / 30;
          dailyProfit = investment.price * amazonDailyRate;
          break;
        case 'AirBnB':
          // 8.75% monthly profit (average of 7.5% and 10%), distributed daily
          const airbnbDailyRate = 0.0875 / 30;
          dailyProfit = investment.price * airbnbDailyRate;
          break;
        case 'Mineral Water':
          // 10.5% monthly profit (average of 8.5% and 12.5%), distributed daily
          const waterDailyRate = 0.105 / 30;
          dailyProfit = investment.price * waterDailyRate;
          break;
        default:
          console.log(`Unknown investment plan: ${investment.investmentPlan}`);
          continue;
      }
      
      await Profit.create({
        userId: investment.userId,
        investmentId: investment._id,
        amount: dailyProfit,
        date: new Date(),
        investmentPlanId: investment.investmentPlan
      });

      // Update user's wallet
     let wallet= await User.findByIdAndUpdate(investment.userId, {
        $inc: { walletBalance: dailyProfit }
      });
    }

    res.json({ message: 'Daily profits processed successfully' });
  } catch (error) {
    console.error('Error processing profits:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all withdrawals
router.get('/withdrawals', async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find()
      .populate('userId', 'username email');
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update withdrawal status
router.put('/withdrawals/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const withdrawal = await Withdrawal.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(withdrawal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/updateinvestments', async (req, res) => {
  try {
    const { id, paymentMode } = req.body;
    const updatedInvestment = await Investment.findByIdAndUpdate(
      id,
      { paymentMode },
      { new: true }
    );

    // Create notification when investment is approved
    if (paymentMode === 'active') {
      await Notification.create({
        userId: updatedInvestment.userId,
        type: 'investment',
        title: 'Investment Approved',
        message: `Your investment of $${updatedInvestment.price} in ${updatedInvestment.investmentPlan} has been approved and is now active.`,
        relatedId: updatedInvestment._id,
        onModel: 'Deposit'
      });
    }

    res.status(200).json(updatedInvestment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all referrals
router.get('/referrals', async (req, res) => {
  try {
    const referrals = await Referral.find()
      .populate('userId', 'Name EmailAddress')
      .select('referralCode totalReferrals successfulReferrals referredTo')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: referrals,
      total: referrals.length
    });
  } catch (error) {
    console.error('Error in /referrals route:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

router.get('/profits', async (req, res) => {
  try {
    const profits = await Profit.find()
      .populate('userId', 'EmailAddress')
      .populate('investmentId', 'price')
      .sort({ date: -1 });

      console.log(profits)
    // Format the response to include user email and investment amount
    const formattedProfits = profits.map(profit => ({
      ...profit.toObject(),
      userEmail: profit.userId ? profit.userId.EmailAddress : 'N/A',
      investmentAmount: profit.investmentId ? profit.investmentId.price : 'N/A'
    }));

    res.json({
      success: true,
      profits: formattedProfits,
      // lastDistributionDate
    });
  } catch (error) {
    console.error('Error in /profits route:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Add profit to investment
router.post('/add-profit', async (req, res) => {
  try {
    const { investmentId, userId, investmentPlanId, amount } = req.body;

    // First check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if profit already exists for this investment
   
        await Profit.create({
        userId,
        investmentId,
        investmentPlanId,
        amount,
        date: new Date()
      });


    return res.status(201).json({
      success: true,
      message: 'Profit added successfully',
    });

  } catch (error) {
    console.error('Error in add-profit:', error);
    return res.status(500).json({
      success: false,
      message: 'Error adding profit',
      error: error.message
    });
  }
});

// Delete user
router.delete('/deleteuser/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Delete all related data
    await Promise.all([
      // Delete user's investments
      Investment.deleteMany({ userId: userId }),
      // Delete user's profits
      Profit.deleteMany({ userId: userId }),
      // Delete user's referrals
      Referral.deleteMany({ userId: userId }),
      // Delete the user
      User.findByIdAndDelete({_id:userId})
    ]);

    res.json({ 
      success: true, 
      message: 'User and all related data deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

router.delete('/deleteinvest/:id', async (req, res) => {
  try {
    const investmentId = req.params.id;
    
    // Check if investment exists
    const investment = await Investment.findById({_id:investmentId});
    if (!investment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Investment not found' 
      });
    }

    // Delete the investment
    await Investment.findByIdAndDelete({_id:investmentId});

    // Delete associated profits
    await Profit.deleteMany({ investmentId: investmentId });

    res.json({ 
      success: true, 
      message: 'Investment and associated profits deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting investment:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get admin notifications
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find({ isRead: false })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark admin notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id },
      { isRead: true },
    );
    // if (!notification) {
    //   return res.status(404).json({ message: "Notification not found" });
    // }
    res.json({message:"success"});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get investments of referred users
router.get('/referred-investments', async (req, res) => {
  try {
    // Get all referrals with their referred users
    const referrals = await Referral.find()
      .populate('userId', 'Name EmailAddress')
      .populate('referredTo', 'Name EmailAddress');

    // Array to store all referred users' investments
    const referredInvestments = [];

    // For each referral, get the investments of referred users
    for (const referral of referrals) {
      if (referral.referredTo && referral.referredTo.length > 0) {
        for (const referredUser of referral.referredTo) {
          // First find the user by email to get their ID
          const user = await User.findOne({ EmailAddress: referredUser });
          // console.log(user)
          if (user) {
            // Get investments for the user using their ID
            const investments = await Investment.find({ userId: user._id, paymentMode: 'active', referalPayment: false })
              .select('price investmentPlan paymentMode createdAt')
              .sort({ createdAt: -1 });
              console.log(investments)
            if (investments.length > 0) {
              referredInvestments.push({
                referrer: {
                  id: referral.userId._id,
                  name: referral.userId.Name,
                  email: referral.userId.EmailAddress
                },
                referredUser: {
                  id: user._id,
                  name: user.Name,
                  email: user.EmailAddress
                },
                investments: investments.map(inv => ({
                  id: inv._id,
                  amount: inv.price,
                  plan: inv.investmentPlan,
                  status: inv.paymentMode,
                  date: inv.createdAt
                }))
              });
            }
          }
        }
      }
    }
    // console.log(referredInvestments)
    res.json({
      success: true,
      data: referredInvestments,
      total: referredInvestments.length
    });
  } catch (error) {
    console.error('Error fetching referred investments:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

router.post('/sendreferalearning', async (req, res) => {
  try {
    const { ReferedFrom, ReferedTo, InvestId, InvestPlan, InvestAmount, Earning } = req.body;

    // Update investment's referalPayment to true and subtract earning from price
    const updatedInvestment = await Investment.findByIdAndUpdate(
      InvestId,
      { 
        referalPayment: true,
        price: InvestAmount 
      },
      { new: true }
    );

    if (!updatedInvestment) {
      return res.status(404).json({
        success: false,
        message: 'Investment not found'
      });
    }

    // Create new referral earning record
    const referralEarning = await ReferralEarningHistory.create({
      ReferedFrom,
      ReferedTo,
      InvestId,
      InvestPlan,
      InvestAmount,
      Earning
    });
    
    // let wallet = await Wallet.findOne({ userId: ReferedFrom });
    // if (!wallet) {
    //   wallet = await Wallet.create({
    //     userId: ReferedFrom,
    //     walletBalance: Earning
    //   });
    // } else {
    //   // Update wallet balance
    //   wallet = await Wallet.findOneAndUpdate(
    //     { userId: ReferedFrom },
    //     { $inc: { walletBalance: Earning } },
    //     { new: true }
    //   );
    // }


    res.json({
      success: true,
      message: 'Referral earning processed successfully',
      data: referralEarning
    });
  } catch (error) {
    console.error('Error processing referral earning:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/fetchreferalearning', async (req, res) => {
  try {
    const referralEarnings = await ReferralEarningHistory.find()
      .populate('ReferedFrom', 'Name EmailAddress')
      .populate('ReferedTo', 'Name EmailAddress')
      .populate('InvestId', 'price investmentPlan')
      .sort({ createdAt: -1 });

    // Format the response
    console.log(referralEarnings)
    // const formattedEarnings = referralEarnings.map(earning => ({
    //   id: earning._id,
    //   referrer: {
    //     id: earning.ReferedFrom._id,
    //     name: earning.ReferedFrom.Name,
    //     email: earning.ReferedFrom.EmailAddress
    //   },
    //   referredUser: {
    //     id: earning.ReferedTo._id,
    //     name: earning.ReferedTo.Name,
    //     email: earning.ReferedTo.EmailAddress
    //   },
    //   investment: {
    //     id: earning.InvestId._id,
    //     amount: earning.InvestId.price,
    //     plan: earning.InvestId.investmentPlan
    //   },
    //   earning: earning.Earning,
    //   date: earning.createdAt
    // }));

    res.json({
      success: true,
      data: referralEarnings,
      total: referralEarnings.length
    });
  } catch (error) {
    console.error('Error fetching referral earnings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get("/userswallet", async (req, res) => {
  try {
    const wallets = await Wallet.find()
      .populate('userId', 'Name EmailAddress')
      .sort({ createdAt: -1 });

    const formattedWallets = wallets.map(wallet => ({
      id: wallet._id,
      user: {
        id: wallet.userId._id,
        name: wallet.userId.Name,
        email: wallet.userId.EmailAddress
      },
      balance: wallet.walletBalance,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt
    }));

    res.json({
      success: true,
      data: formattedWallets,
      total: formattedWallets.length
    });
  } catch (error) {
    console.error('Error fetching wallet data:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
router.get("/PlanProfitToWallet",async(req,res)=>
{
  try {
    const planProfitToWallet = await PlanProfitToWallet.find()
    .populate('userId', 'Name EmailAddress')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: planProfitToWallet,
      total: planProfitToWallet.length
    }); 
  } catch (error) {
    console.error('Error fetching plan profit to wallet:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
    
})

// Get all pending withdrawal requests
router.get('/withdraw-requests', async (req, res) => {
  try {
    const withdrawRequests = await WithdrawRequest.find()
      .populate('userId', 'Name EmailAddress')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: withdrawRequests,
      total: withdrawRequests.length
    });
  } catch (error) {
    console.error('Error fetching withdrawal requests:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update withdrawal request status
router.put('/updatewithdrawrequests', async (req, res) => {
  try {
    const {_id, status ,amount} = req.body;
    const {_id:userId} = req.body.userId;
    if(status === 'approved'){
      const wallet = await Wallet.findOne({ userId: userId });
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'User wallet not found'
        });
      }
      if(wallet.walletBalance < amount){
        return res.status(400).json({
          success: false,
          message: 'Insufficient wallet balance'
        });
      }
      wallet.walletBalance -= amount;
      await wallet.save();
      const updatedWithdrawRequest = await WithdrawRequest.findByIdAndUpdate(
        _id,
        { status: status },
        { new: true }
      ).populate('userId', 'Name EmailAddress');
      const notification = await Notification.create({
        userId: userId,
        type: 'withdrawal',
        title: 'Withdrawal Request Approved',
        message: `Your withdrawal request of $${amount} has been approved`,
        relatedId: _id,
        onModel: 'Withdrawal'
      }); 
      return res.json({  
        success: true,
        message: 'Withdrawal request updated successfully',
        data: updatedWithdrawRequest
      });

      
    }
    else{
      const updatedWithdrawRequest = await WithdrawRequest.findByIdAndUpdate(
        _id,
        { status: status },
        { new: true }
      ).populate('userId', 'Name EmailAddress');
      return res.json({  
        success: true,
        message: 'Withdrawal request updated successfully',
        data: updatedWithdrawRequest
      });
    } 
    
  } catch (error) {
    console.error('Error updating withdrawal request:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/referralwallethistory', async (req, res) => {
  try {
    const referralWalletHistory = await ReferralWalletHistory.find()
      .populate('userId', 'Name EmailAddress')
      .sort({ createdAt: -1 }); 

    res.json({
      success: true,
      data: referralWalletHistory,
      total: referralWalletHistory.length
    });
  } catch (error) {
    console.error('Error fetching referral wallet history:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } 
});

module.exports = router; 