const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const pharmacySchema = new mongoose.Schema({
    pharmacyId:  { type: String, required: true, unique: true, trim: true },
    name:        { type: String, required: true },
    password:    { type: String, required: true },
    email:       { type: String },
    contact:     { type: String },
    address: {
        street: String, city: String, district: String, state: String
    },
    location:    { lat: Number, lng: Number },
    licenseNumber: { type: String },
    openingHours:  { type: String },
    forcePasswordChange: { type: Boolean, default: false },
    createdAt:   { type: Date, default: Date.now }
});

pharmacySchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

pharmacySchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Pharmacy', pharmacySchema);
