const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const doctorSchema = new mongoose.Schema({
    doctorId: { type: String, required: true, unique: true, trim: true },
    hospitalId: { type: String, required: true },
    name: { type: String, required: true },
    speciality: String,
    qualification: String,
    experience: String,
    photoUrl: String,
    availability: { type: String, default: 'Available' },
    shift: { type: String, default: 'Morning' },
    password: { type: String, required: true },
    forcePasswordChange: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

doctorSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

doctorSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Doctor', doctorSchema);
