const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const doctorSchema = new mongoose.Schema({
    doctorId:      { type: String, required: true, unique: true, trim: true },
    name:          { type: String, required: true },
    password:      { type: String, required: true },
    email:         { type: String },
    contact:       { type: String },
    specialization:{ type: String },
    availability:  { type: String, enum: ['Available', 'Unavailable'], default: 'Unavailable' },
    photo:         { type: String },   // URL
    hospitalId:    { type: String, default: null },   // set if works at hospital
    clinicId:      { type: String, default: null },   // set if works at clinic
    forcePasswordChange: { type: Boolean, default: false },
    createdAt:     { type: Date, default: Date.now }
});

doctorSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

doctorSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

doctorSchema.index({ hospitalId: 1 });
doctorSchema.index({ clinicId: 1 });
doctorSchema.index({ availability: 1 });
doctorSchema.index({ hospitalId: 1, availability: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
