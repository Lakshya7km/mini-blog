const mongoose = require('mongoose');

const bloodBankSchema = new mongoose.Schema({
    hospitalId: { type: String, required: true },
    bloodType: { type: String, required: true, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    units: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    notes: String
});

module.exports = mongoose.model('BloodBank', bloodBankSchema);
