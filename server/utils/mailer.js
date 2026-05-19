const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000
});

const sendOtpEmail = async (to, otp) => {
    console.log(`[OTP] ${to} — Your OTP is: ${otp}`);

    const mailOptions = {
        from: `"RapidCare System" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Your RapidCare OTP Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                <h2 style="color: #2563eb; text-align: center;">RapidCare Verification</h2>
                <p style="font-size: 16px; color: #333;">Hello,</p>
                <p style="font-size: 16px; color: #333;">Your One-Time Password (OTP) for verification is:</p>
                <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${otp}</span>
                </div>
                <p style="font-size: 14px; color: #666;">This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
                <p style="font-size: 12px; color: #999; text-align: center;">RapidCare Hospital Ecosystem Management</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP email sent to ${to}`);
        return true;
    } catch (error) {
        console.error('Email sending failed:', error.message);
        console.log('[OTP] Email failed — OTP is still valid via server console log above');
        return false;
    }
};

module.exports = {
    sendOtpEmail
};
