const express = require('express');
const router = express.Router();
const User = require('../mvc/model/usermodel.js');
const Investment = require('../mvc/model/depositmodel.js');
const Profit = require('../mvc/model/Profit.js');
const Withdrawal = require('../mvc/model/Withdrawal.js');

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalInvestments = await Investment.aggregate([
      { $match: { paymentMode: 'active' } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    const totalProfits = await Profit.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });

    res.json({
      totalUsers,
      activeInvestments: totalInvestments[0]?.total || 0,
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
    const users = await User.find().select('-password');
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
      .select('price investmentPlan paymentMode createdAt');

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
        createdAt: inv.createdAt || new Date()
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
          // 1.5% to 3.5% daily profit
          dailyProfit = investment.price * (0.015 + Math.random() * 0.02);
          break;
        case 'RetroDrops':
          // 35% to 50% profit in 180 days, so daily rate is (35-50%)/180
          const dailyRate = (0.35 + Math.random() * 0.15) / 180;
          dailyProfit = investment.price * dailyRate;
          break;
        case 'Amazon':
          // 13% to 15% monthly profit, so daily rate is (13-15%)/30
          const amazonDailyRate = (0.13 + Math.random() * 0.02) / 30;
          dailyProfit = investment.price * amazonDailyRate;
          break;
        case 'AirBnB':
          // 7.5% to 10% monthly profit, so daily rate is (7.5-10%)/30
          const airbnbDailyRate = (0.075 + Math.random() * 0.025) / 30;
          dailyProfit = investment.price * airbnbDailyRate;
          break;
        case 'Mineral Water':
          // 8.5% to 12.5% monthly profit, so daily rate is (8.5-12.5%)/30
          const waterDailyRate = (0.085 + Math.random() * 0.04) / 30;
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

module.exports = router; 