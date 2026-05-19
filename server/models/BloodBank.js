const mongoose = require('mongoose');

const bloodBankSchema = new mongoose.Schema({
    hospitalId:    { type: String, required: true },
    bloodType:     { type: String, enum: ['A+','A-','B+','B-','O+','O-','AB+','AB-'], required: true },
    units:         { type: Number, default: 0 },
    updatedAt:     { type: Date, default: Date.now }
});

// Index to ensure unique hospitalId + bloodType combination
bloodBankSchema.index({ hospitalId: 1, bloodType: 1 }, { unique: true });

module.exports = mongoose.model('BloodBank', bloodBankSchema);
