const { cleanEnv, str, port } = require('envalid');

module.exports = cleanEnv(process.env, {
    PORT: port({ default: 5001 }),
    MONGO_URI: str(),
    JWT_SECRET: str(),
    EMAIL_USER: str({ default: '' }),
    EMAIL_PASS: str({ default: '' }),
    ALLOWED_ORIGINS: str({ default: 'http://localhost:5173' }),
    CLIENT_URL: str({ default: 'http://localhost:5173' }),
    NODE_ENV: str({ choices: ['development', 'production', 'test'], default: 'development' }),
    OTP_EXPIRY_MIN: str({ default: '10' }),
});
