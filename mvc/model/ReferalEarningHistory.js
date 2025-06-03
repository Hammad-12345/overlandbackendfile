const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    ReferedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    ReferedTo: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    InvestId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Deposit'
    },
    InvestPlan: {
        type: String,
        required: true
    },
    InvestAmount: {
        type: Number,
        required: true
    },
    Earning: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ReferralEarningHistory', referralSchema); 