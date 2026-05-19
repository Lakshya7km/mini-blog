const mongoose = require('mongoose');

const appointmentRequestSchema = new mongoose.Schema({
    clinicId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    preferredTime: String,
    status: {
        type: String,
        enum: ['Pending', 'Contacted', 'Booked', 'Cancelled'],
        default: 'Pending',
        index: true,
    },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AppointmentRequest', appointmentRequestSchema);
