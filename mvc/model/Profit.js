const mongoose = require('mongoose');

const profitSchema = new mongoose.Schema({
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
  investmentPlanId: {
    type:String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  sendtoWallet: {
    type: Boolean,
    default: false
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Profit', profitSchema); 