const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const diagnosticCenterSchema = new mongoose.Schema({
    diagnosticId: { type: String, required: true, unique: true, trim: true },
    name:           { type: String, required: true, trim: true },
    password:       { type: String, required: true, select: false },
    email:          { type: String, lowercase: true, trim: true },
    contact:        { type: String, required: true },
    address: {
        street: String,
        city: String,
        district: String,
        state: String,
    },
    location: { lat: Number, lng: Number },
    specialties: [String],
    equipment: [String],
    openingHours: String,
    homeCollection: { type: Boolean, default: false },
    imageUrls: {
        type: [String],
        validate: { validator: (v) => v.length <= 10, message: 'Max 10 images' },
    },
    forcePasswordChange: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

diagnosticCenterSchema.index({ 'address.city': 1 });

diagnosticCenterSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

diagnosticCenterSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('DiagnosticCenter', diagnosticCenterSchema);
