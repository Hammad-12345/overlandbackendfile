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
  originalAmount: {
    type: Number,
    required: true
  },
  profitAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
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

module.exports = mongoose.model('PlanProfitToWallet', planProfitToWalletSchema); 