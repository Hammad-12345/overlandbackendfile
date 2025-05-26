const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  processDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    required: true
  },
  paymentDetails: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema); 