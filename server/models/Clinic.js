const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const clinicSchema = new mongoose.Schema({
    clinicId:   { type: String, required: true, unique: true, trim: true },
    name:       { type: String, required: true },
    password:   { type: String, required: true },
    email:      { type: String },
    contact:    { type: String },
    clinicType: {
        type: String,
        enum: ['General','Specialized','Dental','Eye','Physiotherapy','Dermatology','Pediatric','Orthopedic','Other'],
        default: 'General'
    },
    address: {
        street: String, city: String, district: String, state: String
    },
    location:   { lat: Number, lng: Number },
    gallery:    [String],
    forcePasswordChange: { type: Boolean, default: false },
    createdAt:  { type: Date, default: Date.now }
});

clinicSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

clinicSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Clinic', clinicSchema);
