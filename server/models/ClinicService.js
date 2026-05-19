const mongoose = require('mongoose');

const clinicServiceSchema = new mongoose.Schema({
    clinicId:    { type: String, required: true },
    name:        { type: String, required: true },
    description: { type: String },
    available:   { type: Boolean, default: true },
    createdAt:   { type: Date, default: Date.now }
});

clinicServiceSchema.index({ clinicId: 1 });

module.exports = mongoose.model('ClinicService', clinicServiceSchema);
