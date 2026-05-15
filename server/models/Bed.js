const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema({
    bedId: { type: String, required: true, unique: true },
    hospitalId: { type: String, required: true },
    bedNumber: { type: String, required: true },
    wardNumber: { type: String, required: true },
    bedType: { type: String, default: 'General', enum: ['General', 'ICU', 'Private', 'Emergency', 'HDU', 'Day Care'] },
    status: { type: String, default: 'Vacant', enum: ['Vacant', 'Occupied', 'Reserved', 'Cleaning'] },
    qrUrl: String,
    patientName: String,
    admittedAt: Date,
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bed', bedSchema);
