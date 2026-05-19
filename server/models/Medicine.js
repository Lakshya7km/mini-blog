const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
    pharmacyId:          { type: String, required: true },
    name:                { type: String, required: true },
    medicineNumber:      { type: String },   // batch/identifier code
    category:            { type: String },   // Antibiotic, Painkiller, Vitamin, etc.
    requiresPrescription:{ type: Boolean, default: false },
    inStock:             { type: Boolean, default: true },
    updatedAt:           { type: Date, default: Date.now },
    createdAt:           { type: Date, default: Date.now }
});

// Indexes for fast search
medicineSchema.index({ pharmacyId: 1, name: 1 });
medicineSchema.index({ pharmacyId: 1, medicineNumber: 1 });
medicineSchema.index({ pharmacyId: 1, inStock: 1 });
medicineSchema.index({ name: 'text', medicineNumber: 'text' });

module.exports = mongoose.model('Medicine', medicineSchema);
