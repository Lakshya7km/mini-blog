const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema({
    bedId:         { type: String, required: true, unique: true },
    hospitalId:    { type: String, required: true },
    bedNumber:     { type: String },
    wardNumber:    { type: String },
    ward:          { type: String },
    bedType:       { type: String, enum: ['General', 'ICU', 'Private', 'Emergency', 'Maternity', 'Pediatric'], default: 'General' },
    status:        { type: String, enum: ['Available', 'Occupied', 'Cleaning'], default: 'Available' },
    patientName:   { type: String, default: '' },
    updatedAt:     { type: Date, default: Date.now }
});

bedSchema.index({ hospitalId: 1, status: 1 });
bedSchema.index({ hospitalId: 1, bedType: 1 });

module.exports = mongoose.model('Bed', bedSchema);
