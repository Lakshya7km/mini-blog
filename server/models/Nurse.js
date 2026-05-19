const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const nurseSchema = new mongoose.Schema({
    nurseId:       { type: String, required: true, unique: true, trim: true },
    name:          { type: String, required: true },
    password:      { type: String, required: true },
    email:         { type: String },
    contact:       { type: String },
    hospitalId:    { type: String, required: true },
    forcePasswordChange: { type: Boolean, default: false },
    createdAt:     { type: Date, default: Date.now }
});

nurseSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

nurseSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Nurse', nurseSchema);
