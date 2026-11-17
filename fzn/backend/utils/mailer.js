// utils/mailer.js
// Nodemailer setup using Gmail SMTP
// npm install nodemailer

const nodemailer = require('nodemailer');

// ── Create reusable transporter ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER, // your Gmail address
    pass: process.env.MAIL_PASS, // Gmail App Password (not your login password)
  },
});

// ── Send email verification link ─────────────────────────────────────────────
const sendVerificationEmail = async (toEmail, fullname, token) => {
  const link = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: `"Royal Fitness" <${process.env.MAIL_USER}>`,
    to:   toEmail,
    subject: '✅ Verify your Royal Fitness account',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0a;color:#f0ede8;border-radius:12px;overflow:hidden">
        <div style="background:#111;padding:28px 32px;border-bottom:2px solid #a3d959">
          <h1 style="font-size:28px;letter-spacing:4px;color:#a3d959;margin:0">ROYAL FITNESS</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#f0ede8;margin-bottom:8px">Welcome, ${fullname}! 💪</h2>
          <p style="color:#888;line-height:1.7;margin-bottom:28px">
            Thanks for joining Royal Fitness. Please verify your email address to activate your account and access all features.
          </p>
          <a href="${link}" style="display:inline-block;padding:14px 28px;background:#a3d959;color:#0a0a0a;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;letter-spacing:0.5px">
            Verify Email Address
          </a>
          <p style="color:#555;font-size:12px;margin-top:24px">
            This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
          <p style="color:#333;font-size:12px">Or copy this link: <span style="color:#a3d959">${link}</span></p>
        </div>
      </div>
    `,
  });
};

// ── Send OTP for password reset ───────────────────────────────────────────────
const sendOTPEmail = async (toEmail, fullname, otp) => {
  await transporter.sendMail({
    from: `"Royal Fitness" <${process.env.MAIL_USER}>`,
    to:   toEmail,
    subject: '🔐 Your Royal Fitness Password Reset OTP',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0a;color:#f0ede8;border-radius:12px;overflow:hidden">
        <div style="background:#111;padding:28px 32px;border-bottom:2px solid #a3d959">
          <h1 style="font-size:28px;letter-spacing:4px;color:#a3d959;margin:0">ROYAL FITNESS</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#f0ede8;margin-bottom:8px">Password Reset Request</h2>
          <p style="color:#888;line-height:1.7;margin-bottom:24px">
            Hi ${fullname}, use the OTP below to reset your password. It expires in <strong style="color:#f0ede8">10 minutes</strong>.
          </p>
          <div style="background:#1a1a1a;border:1px solid rgba(163,217,89,0.3);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#a3d959">${otp}</div>
            <div style="font-size:12px;color:#555;margin-top:8px">One-Time Password — valid for 10 minutes</div>
          </div>
          <p style="color:#555;font-size:12px">
            If you didn't request a password reset, please ignore this email. Your account is safe.
          </p>
        </div>
      </div>
    `,
  });
};

// ── Send welcome email after verification ─────────────────────────────────────
const sendWelcomeEmail = async (toEmail, fullname) => {
  await transporter.sendMail({
    from: `"Royal Fitness" <${process.env.MAIL_USER}>`,
    to:   toEmail,
    subject: '🎉 Welcome to Royal Fitness — Account Verified!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0a;color:#f0ede8;border-radius:12px;overflow:hidden">
        <div style="background:#111;padding:28px 32px;border-bottom:2px solid #a3d959">
          <h1 style="font-size:28px;letter-spacing:4px;color:#a3d959;margin:0">ROYAL FITNESS</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#a3d959;margin-bottom:8px">You're in! 🏋️</h2>
          <p style="color:#888;line-height:1.7;margin-bottom:24px">
            Hi ${fullname}, your email is verified. You can now log in and start your fitness journey!
          </p>
          <a href="${process.env.CLIENT_URL}/login" style="display:inline-block;padding:14px 28px;background:#a3d959;color:#0a0a0a;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px">
            Go to Login →
          </a>
          <div style="margin-top:28px;padding:16px;background:#1a1a1a;border-radius:8px">
            <p style="color:#888;font-size:13px;margin:0">🏆 Explore our plans, hire a personal trainer, and get your diet guide — all in your dashboard.</p>
          </div>
        </div>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendOTPEmail, sendWelcomeEmail };