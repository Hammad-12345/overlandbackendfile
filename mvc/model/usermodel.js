const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    Name: {
      type: String,
      required: true,
      trim: true,
    },
    DateOfBirth: {
      type: String,
      required: true,
    },
    Country: {
      type: String,
      required: true,
    },
    ContactNumber: {
      type: String,
      required: true,
      unique: true,
    },
    EmailAddress: {
      type: String,
      required: true,
      unique: true,
    },
    Password: {
      type: String,
      required: true,
    },
    Role: {
      type: String,
      required: true,
    },
    Otp: {
      type: Number,
      required: true
    },
    profileImage: {
      type: String,
      default: "" // Default empty string for no image
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
