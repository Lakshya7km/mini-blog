const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const hospitalSchema = new mongoose.Schema({
    hospitalId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true },
    contact: { type: String },
    email: { type: String },
    password: { type: String, required: true },
    address: {
        street: String, city: String, district: String, state: String
    },
    location: { lat: Number, lng: Number },
    googleMapUrl: String,
    services: [String],
    facilities: [String],
    insurance: [String],
    tests: [String],
    procedures: [String],
    surgery: [String],
    therapy: [String],
    management: [String],
    highlights: [String],
    treatment: [String],
    gallery: [String],
    attendanceQR: {
        presentQR: String,
        absentQR: String,
        generatedAt: Date
    },
    forcePasswordChange: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

hospitalSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

hospitalSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Hospital', hospitalSchema);
