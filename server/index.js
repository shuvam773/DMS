const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { logRequest, logResponse, errorLogger } = require('./middlewares/loggingMiddleware');
const morgan = require('morgan');



// Routes
const authRoutes = require('./routes/authRoutes');
const drugRoutes = require('./routes/drugRoutes');
const instituteOrderRoutes = require('./routes/instituteOrderRoutes');
const usersRoutes = require('./routes/usersRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const sellerRoutes = require('./routes/sellerRoutes')
const historyRoutes = require('./routes/historyRoutes');
const pharmacyOrderRoutes = require('./routes/pharmacyOrderRoutes');
const adminOrderRoutes = require('./routes/adminOrderRoutes');
const resetProfileRoutes = require('./routes/resetProfileRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const drugTypeNameRoutes = require('./routes/drugTypeNameRouters');

const PORT = process.env.PORT;

// HTTP request logging (complementary to our custom logging)
app.use(morgan('dev', {
  skip: (req) => req.path === '/healthcheck' // Skip health checks
}));


// Middleware
app.set('trust proxy', 1); // Trust first proxy
app.use(express.json());
app.use(cors());

//logging middleware
app.use(logRequest);
app.use(logResponse);

// Routes
app.use("/api/auth", authRoutes);
// app.use("/api/users", userRoutes);
app.use("/api/drugs", drugRoutes);
app.use("/api/orders", instituteOrderRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/history', historyRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use('/api/pharmacy', pharmacyOrderRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/reset", resetProfileRoutes)
app.use("/api/chatbot", chatbotRoutes);
app.use('/api/drug-types-names', drugTypeNameRoutes);

// Error handling middleware (must be after all other middleware and routes)
app.use(errorLogger);

// PostgreSQL connection
const connectDb = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Start server after DB connection
const startServer = async () => {
    try {
        await connectDb.connect().then(()=>console.log("PostgreSQL connected"));

        // Making the client accessible in routes via app locals
        app.locals.db = connectDb;

        // Ensure the uploads directory exists
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
        }

        // Ensure logs directory exists
        const logsDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir);
        }

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to connect to PostgreSQL:", error.message);
        process.exit(1);
    }
};

startServer();
