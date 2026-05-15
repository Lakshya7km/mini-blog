require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const SuperAdmin = require('./models/SuperAdmin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET', 'POST'] }
});

// Make io globally accessible
global.io = io;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/hospitals', require('./routes/hospital'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/nurses', require('./routes/nurses'));
app.use('/api/ambulances', require('./routes/ambulances'));
app.use('/api/beds', require('./routes/beds'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/bloodbank', require('./routes/bloodbank'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/admin', require('./routes/admin'));

// Serve React frontend in production
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
});
// Socket.io
io.on('connection', (socket) => {
    // Join rooms
    socket.on('join:hospital', (hospitalId) => {
        socket.join(hospitalId);
    });
    socket.on('join:ambulance', (ambulanceId) => {
        socket.join(ambulanceId);
    });

    // Ambulance sends live GPS
    socket.on('ambulance:location', async (data) => {
        const { ambulanceId, hospitalId, lat, lng } = data;
        // Broadcast to the hospital room
        io.to(hospitalId).emit('ambulance:location', { ambulanceId, lat, lng, updatedAt: new Date() });
        // Save to DB
        try {
            const Ambulance = require('./models/Ambulance');
            await Ambulance.findOneAndUpdate({ ambulanceId }, { location: { lat, lng, updatedAt: new Date() } });
        } catch (err) { console.error('Socket DB Error (Location):', err.message); }
    });

    // Ambulance status change
    socket.on('ambulance:status', async (data) => {
        const { ambulanceId, hospitalId, status } = data;
        io.to(hospitalId).emit('ambulance:status', { ambulanceId, status });
        try {
            const Ambulance = require('./models/Ambulance');
            await Ambulance.findOneAndUpdate({ ambulanceId }, { status });
        } catch (err) { console.error('Socket DB Error (Status):', err.message); }
    });

    // Bed status update
    socket.on('bed:update', (data) => {
        io.to(data.hospitalId).emit('bed:update', data);
    });

    socket.on('disconnect', () => { });
});

// MongoDB connection
async function ensureSuperAdmin() {
    const fixedUsername = 'admin@rapidcare';
    const fixedPassword = 'rapidcare123';

    let admin = await SuperAdmin.findOne({ username: fixedUsername });

    if (!admin) {
        admin = new SuperAdmin({
            username: fixedUsername,
            password: fixedPassword
        });
        await admin.save();
        console.log(`Bootstrap superadmin created: ${fixedUsername}`);
        return;
    }

    const passwordMatches = await admin.comparePassword(fixedPassword);
    if (!passwordMatches) {
        admin.password = fixedPassword;
        await admin.save();
        console.log(`Bootstrap superadmin password reset: ${fixedUsername}`);
    }

    try {
        const Nurse = require('./models/Nurse');
        const nurse = await Nurse.findOne({ nurseId: 'bmc_nurse_001' });
        if (nurse && nurse.name.includes('Dr.')) {
            nurse.name = 'Nurse Priya Sharma';
            await nurse.save();
            console.log('Fixed nurse name');
        }
    } catch (err) {
        console.error(err);
    }
}

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        await ensureSuperAdmin();
        const PORT = process.env.PORT || 5001;
        server.listen(PORT, () => console.log(`RapidCare MERN server running on http://localhost:${PORT}`));
    })
    .catch(err => { console.error('MongoDB connection error:', err.message); process.exit(1); });
