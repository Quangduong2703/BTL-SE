require('dotenv').config();
const nodemailer = require('nodemailer');

const isEmailConfigured = Boolean(
  process.env.EMAIL_HOST && process.env.EMAIL_PORT && process.env.EMAIL_USER && process.env.EMAIL_PASS
);

const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@vocabup.local';

async function sendVerificationCodeEmail({ email, code }) {
const subject = 'Mã xác thực đăng ký VocabUp';
  const text = `Mã xác thực của bạn là: ${code}. Mã này có hiệu lực trong 10 phút.`;
  const html = `<p>Xin chào,</p><p>Mã xác thực của bạn là: <strong>${code}</strong>.</p><p>Mã này có hiệu lực trong 10 phút.</p><p>Nếu bạn không yêu cầu mã này, hãy bỏ qua email.</p>`;

  if (!transporter) {
    console.warn('Email không được cấu hình. Mã xác thực:', code, 'Email:', email);
    return;
  }

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject,
    text,
    html,
  });
}

module.exports = {
  sendVerificationCodeEmail,
};
