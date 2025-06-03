const mongoose = require("mongoose");

const DepositSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    investmentPlan: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    depositAddress: {
      type: String,
      required: true,
    },
    screenshot: {
      type: String, // Usually a URL or file path
      required: true,
    },
    paymentMode: {
      type: String,
      required: true,
    },
    referalPayment: {
      type: Boolean,
      default: false
    },
    // expired:{
    //   type:Boolean,
    //   default:false
    // }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Deposit", DepositSchema);
