const express = require("express");
const router = express.Router();
const {register,login,Otp,newpassword} = require("../controller/authcontroller")

router.post("/register",register)
router.post("/login",login)
router.post("/otp",Otp)
router.post("/newpassword",newpassword)
module.exports = router
