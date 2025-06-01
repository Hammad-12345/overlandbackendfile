const express = require("express");
const dashboardrouter = express.Router();
const { createDeposit, fetchallinvestment, updateProfile, fetchUserProfits } = require("../controller/dashboardcomtroller");
const jwt = require("jsonwebtoken");
const { verifyToken } = require("../Middleware/auth");
const Notification = require("../model/notificationModel");



dashboardrouter.post("/deposit",verifyToken, createDeposit);

dashboardrouter.get("/fetchallinvestment",verifyToken,fetchallinvestment)

dashboardrouter.put("/updateprofile", verifyToken, updateProfile);

dashboardrouter.get("/fetchprofit", verifyToken, fetchUserProfits);

// Fetch notifications
dashboardrouter.get("/notifications", verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark notification as read
dashboardrouter.put("/notifications/:id/read", verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// dashboardrouter.get("/fetchgoldtradinghistory",verifyToken,fetchallgoldtradinghistory)
// dashboardrouter.get("/fetchairbnbhistory",verifyToken,fetchallgoldtradinghistory)
// dashboardrouter.get("/fetchamazonhistory",verifyToken,fetchallgoldtradinghistory)
// dashboardrouter.get("/fetchmineralwaterhistory",verifyToken,fetchallgoldtradinghistory)


module.exports = dashboardrouter;
