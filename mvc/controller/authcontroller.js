const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt"); // assuming you're using bcrypt
const Users = require("../model/usermodel"); // adjust path as needed
const jwt = require("jsonwebtoken");
const Referral = require("../model/referralModel");
const Notification = require("../model/notificationModel");

const register = async (req, res) => {
  const {
    Name,
    DateOfBirth,
    Country,
    ContactNumber,
    EmailAddress,
    Password,
    CountryPhoneCode,
    ReferralCode,
  } = req.body;
  console.log(ReferralCode);
  try {
    const FullContactNumber = `${CountryPhoneCode}${ContactNumber}`;

    const existingUser = await Users.findOne({
      $or: [{ EmailAddress }, { ContactNumber: FullContactNumber }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email or Contact Number already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);

    const newUser = new Users({
      Name,
      DateOfBirth,
      Country,
      ContactNumber: FullContactNumber,
      EmailAddress,
      Password: hashedPassword,
      Role: "user",
      Otp: 0,
    });

    await newUser.save();
    if (ReferralCode) {
      console.log(ReferralCode);
      const referrer = await Referral.findOne({ referralCode: ReferralCode });
      if (referrer) {
        console.log(referrer);
        try {
          const newReferral = await Referral.findOneAndUpdate(
            { referralCode: ReferralCode },
            {
              $set: {
                userId: referrer.userId,
                referralCode: ReferralCode,
                referredTo: referrer.referredTo
                  ? [...referrer.referredTo, EmailAddress]
                  : [EmailAddress],
                updatedAt: new Date(),
              },
              $inc: {
                totalReferrals: 1,
                successfulReferrals: 1,
              },
            },
            { new: true, upsert: true }
          );

          if (!newReferral) {
            throw new Error("Failed to update referral");
          }
        } catch (error) {
          console.error("Error updating referral:", error);
          // Handle the error appropriately
        }
      }
    }
    // ✅ Send welcome email
    const transporter = nodemailer.createTransport({
      service: "gmail", // or your SMTP provider
      auth: {
        user: "Overlandssolutions@gmail.com", // replace with your email
        pass: "nwxo isrr mcje khgl", // use App Password if using Gmail
      },
    });

    const mailOptions = {
      from: '"Overland Solutions"',
      to: EmailAddress,
      subject: "Welcome to Overland Solutions",
      html: `
        <div style="max-width: 600px; margin: auto; font-family: 'Poppins', sans-serif; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0d1321; padding: 30px 20px; text-align: center;">
            <img src="https://overlandresources.s3.eu-north-1.amazonaws.com/newlogo-removebg-preview.png" alt="Overland Solutions Logo" style="height: 50px; margin-bottom: 10px;" />
            <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Welcome to Overland Solutions</h1>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
            <h2 style="color: #0d1321; font-size: 22px;">Hello ${Name},</h2>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Thank you for registering at <strong>Overland Solutions</strong>. We're thrilled to have you with us! 🎉
            </p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              You now have full access to our platform where you can manage your trading accounts, view performance stats, and more.
            </p>
            <a href="https://overlandsolutions.net/signin" style="display: inline-block; margin-top: 25px; padding: 12px 24px; background-color: #0052cc; color: #ffffff; text-decoration: none; font-weight: 500; border-radius: 6px;">
              Login
            </a>
            <p style="margin-top: 40px; font-size: 13px; color: #888;">
              If you didn't create this account, you can safely ignore this email or contact our support team.
            </p>
          </div>
          <div style="background-color: #f7f7f7; padding: 20px; text-align: center; font-size: 12px; color: #999;">
            &copy; ${new Date().getFullYear()} Overland Solutions. All rights reserved.<br />
            <a href="https://overlandsolutions.net/policy" style="color: #999; text-decoration: none;">Privacy Policy</a> |
            <a href="https://overlandsolutions.net/policy" style="color: #999; text-decoration: none;">Support</a>
          </div>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email sending failed:", error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });

    // Create notification for admin
    await Notification.create({
      userId: newUser._id, // This will be used to identify admin notifications
      type: 'register',
      title: 'New User Registration',
      message: `New user ${Name} (${EmailAddress}) has registered.`,
      isRead: false,
      relatedId: newUser._id,
      onModel: 'Register'
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        Name: newUser.Name,
        EmailAddress: newUser.EmailAddress,
        ContactNumber: newUser.ContactNumber,
        Country: newUser.Country,
        Role: newUser.Role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if user exists
    const user = await Users.findOne({ EmailAddress: email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    // 3. Generate 5-digit OTP
    const otp = Math.floor(10000 + Math.random() * 90000).toString();

    // 4. Save OTP to user
    user.Otp = otp;
    await user.save();

    // 5. Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.EmailAddress,
        name: user.Name,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" } // token valid for 1 hour
    );

    // 6. Send OTP via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "Overlandssolutions@gmail.com", // replace with your email
        pass: "nwxo isrr mcje khgl", // use App Password if using Gmail
      },
    });

    const mailOptions = {
      from: `"Overland Solutions"`,
      to: email,
      subject: "Your OTP Code for Login",
      html: `<div style="max-width: 600px; margin: auto; font-family: 'Poppins', sans-serif; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #0d1321; padding: 30px 20px; text-align: center;">
    <img src="https://overlandresources.s3.eu-north-1.amazonaws.com/newlogo-removebg-preview.png" alt="Overland Solutions Logo" style="height: 50px; margin-bottom: 10px;" />
    <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Login Verification</h1>
  </div>
  <div style="padding: 30px; background-color: #ffffff;">
    <h2 style="color: #0d1321; font-size: 22px;">Hello ${user.Name},</h2>
    <p style="font-size: 16px; color: #333; line-height: 1.6;">
      We received a login request for your account on <strong>Overland Solutions</strong>.
    </p>
    <p style="font-size: 16px; color: #333; line-height: 1.6;">
      Please use the following One-Time Password (OTP) to verify your login:
    </p>
    <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin: 20px auto;">
      <div style="font-size: 24px; font-weight: bold; background-color: #f4f4f4; text-align: center; padding: 15px; border-radius: 6px; color: #2c3e50;width: 100%;">
        ${otp}
      </div>
    </div>
    <p style="margin-top: 30px; font-size: 16px; color: #333;">
      If you did not attempt to log in, please ignore this message or contact support immediately.
    </p>
    <p style="font-size: 16px; color: #333; line-height: 1.6;">Best regards,<br/><strong>Overland Solutions Team</strong></p>
  </div>
  <div style="background-color: #f7f7f7; padding: 20px; text-align: center; font-size: 12px; color: #999;">
    &copy; ${new Date().getFullYear()} Overland Solutions. All rights reserved.<br />
    <a href="https://overlandsolutions.net/policy" style="color: #999; text-decoration: none;">Privacy Policy</a> |
    <a href="https://overlandsolutions.net/policy" style="color: #999; text-decoration: none;">Support</a>
  </div>
</div>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email sending failed:", error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });

    // 7. Respond to client with token
    res.status(200).json({
      message: "OTP sent to email",
      step: "otp_verification",
      token, // frontend will store this for later use
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const Otp = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>
    if (!token)
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const userId = decoded.id; // assuming you signed token with { id: user._id }

    // Fetch user
    const user = await Users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP is required" });

    // Compare OTP
    if (user.Otp !== Number(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Optionally clear OTP after use
    user.Otp = 0;
    await user.save();

    const newtoken = jwt.sign(
      {
        id: user._id,
        email: user.EmailAddress,
        name: user.Name,
      },
      process.env.JWT_SECRET_KEY,

    );
    res
      .status(200)
      .json({ message: "OTP verified successfully", newtoken, user });
  } catch (error) {
    console.error("OTP verification error:", error);
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

const newpassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // 1. Find the user by email
    const user = await Users.findOne({ EmailAddress: email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. Update the password
    user.Password = hashedPassword;
    await user.save();

    // 4. Respond to client
    res.status(200).json({ message: "password reset successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  Otp,
  newpassword,
};
