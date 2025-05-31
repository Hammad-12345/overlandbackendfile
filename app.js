const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const app = express();
const { connectiondb } = require("./db/connect");
const authroute = require("./mvc/route/authroutes");
const dashboardrouter = require("./mvc/route/userdashboardroutes");
const referralRouter = require("./mvc/route/referralRoutes");
const contactRouter = require("./mvc/route/contactRoutes");
const multer = require("multer");
const path = require("path");

// Custom storage to keep original extension
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Use Date.now() + original extension for uniqueness
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

const upload = multer({ storage });

const allowedOrigins = [ 'http://localhost:3000', 'https://overlandsolutions.net', 'http://overlandsolutions.net' ]; 
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // if you're sending cookies or auth headers
}));
app.use(express.json());

dotenv.config();
connectiondb()

// File upload endpoint
app.post("/upload", upload.single("img"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  // Build a proper image URL
  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// Serve static files from uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("hello world");
});
app.get("/register",(req,res)=>
{
  res.send("register is in process");
})

app.use("/auth", authroute);
app.use("/dashboard", dashboardrouter);
app.use("/api/user", referralRouter);
app.use("/contact", contactRouter);

// Additional routes from server.js
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(`${process.env.PORT}`,'0.0.0.0', () => {
  console.log("server listen");
});
