const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const ipRoutes = require("./routes/ipRoutes");
const disputeRoutes = require("./routes/disputeRoutes");
const transactionRoutes = require("./routes/transactionRoutes"); // Added transactionRoutes
const settingsRoutes = require('./routes/settingsRoutes');
const dashboardRoutes = require("./routes/dashboardRoutes"); // Analytics
const paymentRoutes = require('./routes/paymentRoutes');
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors({
    origin: '*', // Allow all origins for the deployed version later
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// Ping route for deployment health checks
app.get("/", (req, res) => {
    res.status(200).send("Backend is running properly!");
});

app.use("/api/auth", authRoutes);
app.use("/api/ip", ipRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/transactions", transactionRoutes);
app.use('/api/settings', settingsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use('/api/payments', paymentRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
