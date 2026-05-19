const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const hospitalSchema = new mongoose.Schema({
    hospitalId:    { type: String, required: true, unique: true, trim: true },
    name:          { type: String, required: true },
    password:      { type: String, required: true },
    email:         { type: String },
    contact:       { type: String },
    address: {
        street: String, city: String, district: String, state: String
    },
    location:      { lat: Number, lng: Number },
    googleMapUrl:  { type: String },
    services:      [String],
    facilities:    [String],
    insurance:     [String],
    tests:         [String],
    gallery:       [String],
    forcePasswordChange: { type: Boolean, default: false },
    createdAt:     { type: Date, default: Date.now }
});

hospitalSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

hospitalSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

hospitalSchema.index({ 'address.city': 1 });

module.exports = mongoose.model('Hospital', hospitalSchema);
