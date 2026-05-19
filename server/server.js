require('dotenv').config();
const env = require('./config/env');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const SuperAdmin = require('./models/SuperAdmin');
const { globalLimiter } = require('./config/rateLimit');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true,
    },
});

global.io = io;

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'ws:', 'wss:'],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

app.use(compression());
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(globalLimiter);

app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) cb(null, true);
        else cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/hospitals', require('./routes/hospital'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/nurses', require('./routes/nurses'));
app.use('/api/ambulances', require('./routes/ambulances'));
app.use('/api/beds', require('./routes/beds'));
app.use('/api/bloodbank', require('./routes/bloodbank'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/clinic', require('./routes/clinic'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/diagnostic', require('./routes/diagnostic'));

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'Internal server error' });
});

const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
        if (err) next();
    });
});

const ROOM_PATTERN = /^(hospital|pharmacy|clinic|diagnostic|ambulance):[a-zA-Z0-9_-]+$/;

const joinValidatedRoom = (socket, room) => {
    if (ROOM_PATTERN.test(room)) {
        socket.join(room);
        logger.debug(`Socket ${socket.id} joined ${room}`);
    }
};

io.on('connection', (socket) => {
    socket.on('join', (room) => joinValidatedRoom(socket, room));

    // Backward compatibility with existing clients
    socket.on('join:hospital', (id) => joinValidatedRoom(socket, `hospital:${id}`));
    socket.on('join:pharmacy', (id) => joinValidatedRoom(socket, `pharmacy:${id}`));
    socket.on('join:clinic', (id) => joinValidatedRoom(socket, `clinic:${id}`));
    socket.on('join:diagnostic', (id) => joinValidatedRoom(socket, `diagnostic:${id}`));
    socket.on('join:ambulance', (id) => joinValidatedRoom(socket, `ambulance:${id}`));

    socket.on('disconnect', () => {});
});

async function ensureSuperAdmin() {
    const fixedUsername = 'rapidcare@admin';
    const fixedPassword = 'LAKSHya07$';
    const fixedEmail = 'lakshyakumar7cr@gmail.com';

    let admin = await SuperAdmin.findOne({ username: fixedUsername });
    if (!admin) {
        admin = new SuperAdmin({ username: fixedUsername, password: fixedPassword, email: fixedEmail, emailVerified: false });
        await admin.save();
        logger.info(`Superadmin created: ${fixedUsername} with email ${fixedEmail}`);
        return;
    }

    if (!admin.email) {
        admin.email = fixedEmail;
        admin.emailVerified = false;
        await admin.save();
        logger.info(`Superadmin email updated: ${fixedEmail}`);
    }

    const passwordMatches = await admin.comparePassword(fixedPassword);
    if (!passwordMatches) {
        admin.password = fixedPassword;
        await admin.save();
        logger.info(`Superadmin password reset: ${fixedUsername}`);
    }
}

mongoose.connect(env.MONGO_URI)
    .then(async () => {
        await ensureSuperAdmin();
        server.listen(env.PORT, () => {
            logger.info(`RapidCare V3 server running on http://localhost:${env.PORT}`);
        });
    })
    .catch((err) => {
        logger.error('MongoDB connection error', { message: err.message });
        process.exit(1);
    });
