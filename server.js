const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

// Routes imports
const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const ipRoutes = require("./routes/ipRoutes");
const disputeRoutes = require("./routes/disputeRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const searchRoutes = require("./routes/searchRoutes");
const licenseRoutes = require("./routes/licenseRoutes");
const alertRoutes = require("./routes/alertRoutes");
const settingsRoutes = require('./routes/settingsRoutes');
const dashboardRoutes = require("./routes/dashboardRoutes");
const paymentRoutes = require('./routes/paymentRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// Ping route for health checks
app.get("/", (req, res) => {
    res.status(200).send("Backend is running properly!");
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/ip", ipRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/licenses", licenseRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/transactions", transactionRoutes);
app.use('/api/settings', settingsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use("/api/payouts", payoutRoutes);

// Error Handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
