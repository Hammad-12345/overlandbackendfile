const express = require('express');
const router = express.Router();
const User = require('../mvc/model/usermodel.js');
const Investment = require('../mvc/model/depositmodel.js');
const Profit = require('../mvc/model/Profit.js');
const Withdrawal = require('../mvc/model/Withdrawal.js');
const Referral = require('../mvc/model/referralModel.js');

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
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });

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
      'Gold Trading': {
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

    // Create new profit record
    const profit = await Profit.create({
      userId,
      investmentId,
      investmentPlanId,
      amount,
      date: new Date()
    });

    // Update user's wallet balance
    await User.findByIdAndUpdate(userId, {
      $inc: { walletBalance: amount }
    });

    res.json({ success: true, profit });
  } catch (error) {
    console.error('Error adding profit:', error);
    res.status(500).json({ message: error.message });
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

module.exports = router; 