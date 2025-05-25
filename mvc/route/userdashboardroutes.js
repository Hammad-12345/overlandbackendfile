const express = require("express");
const dashboardrouter = express.Router();
const { createDeposit, fetchallinvestment, updateProfile } = require("../controller/dashboardcomtroller");
const jwt = require("jsonwebtoken");
const { verifyToken } = require("../Middleware/auth");



dashboardrouter.post("/deposit",verifyToken, createDeposit);

dashboardrouter.get("/fetchallinvestment",verifyToken,fetchallinvestment)

dashboardrouter.put("/updateprofile", verifyToken, updateProfile);

// dashboardrouter.get("/fetchgoldtradinghistory",verifyToken,fetchallgoldtradinghistory)
// dashboardrouter.get("/fetchairbnbhistory",verifyToken,fetchallgoldtradinghistory)
// dashboardrouter.get("/fetchamazonhistory",verifyToken,fetchallgoldtradinghistory)
// dashboardrouter.get("/fetchmineralwaterhistory",verifyToken,fetchallgoldtradinghistory)


module.exports = dashboardrouter;
