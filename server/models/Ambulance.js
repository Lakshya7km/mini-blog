const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const ambulanceSchema = new mongoose.Schema({
    ambulanceId:   { type: String, required: true, unique: true, trim: true },
    vehicleNumber: { type: String, required: true },
    password:      { type: String, required: true },
    driverName:    { type: String },
    contact:       { type: String },
    hospitalId:    { type: String },
    status:        { type: String, enum: ['On Duty', 'Off Duty'], default: 'Off Duty' },
    location:      { lat: Number, lng: Number },
    emt:           { name: String, emtId: String, mobile: String },
    pilot:         { name: String, pilotId: String, mobile: String },
    assignedTask:  { type: String },
    lastLogin:     { type: Date },
    forcePasswordChange: { type: Boolean, default: false },
    createdAt:     { type: Date, default: Date.now },
    updatedAt:     { type: Date, default: Date.now }
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
