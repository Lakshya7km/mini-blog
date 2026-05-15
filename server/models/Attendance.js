const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    doctorId: { type: String, required: true },
    hospitalId: { type: String, required: true },
    date: { type: Date, required: true },
    availability: { type: String, enum: ['Present', 'Absent', 'Leave'], default: 'Present' },
    shift: { type: String, default: 'Morning' },
    checkIn: Date,
    checkOut: Date,
    totalHours: String,
    method: { type: String, default: 'Manual' },
    markedBy: { type: String, default: 'Doctor' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Attendance', attendanceSchema);
