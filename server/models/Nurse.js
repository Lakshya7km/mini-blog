const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const nurseSchema = new mongoose.Schema({
    nurseId: { type: String, required: true, unique: true, trim: true },
    hospitalId: { type: String, required: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    photoUrl: String,
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
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
