const mongoose = require('mongoose');

const planProfitToWalletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  investmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deposit',
    required: true
  },
  investmentPlan: {
    type: String,
    required: true
  },
  InvestmentAmount: {
    type: Number,
    required: true
  },
  AmountToWallet: {
    type: Number,
    required: true
  },
  ReferedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  RemainingInvestmentAmount: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'completed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ReferalToWalletHistory', planProfitToWalletSchema); 