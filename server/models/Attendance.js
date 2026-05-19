const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    doctorId:   { type: String, required: true, index: true },
    hospitalId: { type: String, required: true, index: true },
    date:       { type: String, required: true },
    status:     { type: String, enum: ['Present', 'Absent'], required: true },
    markedBy:   { type: String, enum: ['doctor', 'reception'], required: true },
    markedAt:   { type: Date, default: Date.now },
});

attendanceSchema.index({ doctorId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
