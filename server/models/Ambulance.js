const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const ambulanceSchema = new mongoose.Schema({
    ambulanceId: { type: String, required: true, unique: true, trim: true },
    hospitalId: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    ambulanceNumber: String,
    password: { type: String, required: true },
    status: { type: String, default: 'Offline', enum: ['On Duty', 'Offline', 'In Transit'] },
    location: { lat: Number, lng: Number, updatedAt: Date },
    emt: { name: String, emtId: String, mobile: String },
    pilot: { name: String, pilotId: String, mobile: String },
    assignedTask: String, // Dynamic task assigned by reception
    forcePasswordChange: { type: Boolean, default: false },
    lastLogin: Date,
    createdAt: { type: Date, default: Date.now }
});

ambulanceSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

ambulanceSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Ambulance', ambulanceSchema);
