const crypto = require('crypto');
const bcrypt = require('bcrypt');

const generateOtp = () => {
    return crypto.randomInt(100000, 999999).toString();
};

const hashOtp = async (otp) => {
    return await bcrypt.hash(otp, 10);
};

const verifyOtp = async (otp, hash) => {
    return await bcrypt.compare(otp, hash);
};

module.exports = {
    generateOtp,
    hashOtp,
    verifyOtp
};
