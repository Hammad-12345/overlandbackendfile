const mongoose = require('mongoose');

const withdrawRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['Tron (TRC20)', 'BNB Smart Chain (BEP20)', 'Binance ID']
    },
    walletAddress: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 10 // Minimum withdrawal amount
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('WithdrawRequest', withdrawRequestSchema); 