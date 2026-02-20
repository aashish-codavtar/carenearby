const OTP = require('../models/OTP');

const MAX_ATTEMPTS = 5; // lock after 5 wrong guesses

function getTTLMs() {
  return (parseInt(process.env.OTP_TTL_MINUTES, 10) || 5) * 60 * 1000;
}

/**
 * Generate and store a 6-digit OTP for the given phone number.
 * Replaces any existing OTP for that phone.
 * In production: replace console.log with Twilio / AWS SNS.
 */
async function generateOTP(phone) {
  const otp       = Math.floor(100_000 + Math.random() * 900_000).toString();
  const expiresAt = new Date(Date.now() + getTTLMs());

  await OTP.findOneAndUpdate(
    { phone },
    { otp, expiresAt, attempts: 0 },
    { upsert: true, new: true }
  );

  // TODO: replace with Twilio SMS in production
  console.log(`[DEV] OTP for ${phone}: ${otp}`);

  return otp;
}

/**
 * Verify the OTP for the given phone.
 * Enforces attempt limits and expiry.
 * Returns { valid: true } or { valid: false, error: string }
 */
async function verifyOTP(phone, code) {
  const entry = await OTP.findOne({ phone });

  if (!entry || new Date() > entry.expiresAt) {
    await OTP.deleteOne({ phone });
    return { valid: false, error: 'OTP expired. Please request a new one.' };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    await OTP.deleteOne({ phone });
    return { valid: false, error: 'Too many failed attempts. Please request a new OTP.' };
  }

  if (entry.otp !== code) {
    await OTP.findOneAndUpdate({ phone }, { $inc: { attempts: 1 } });
    const remaining = MAX_ATTEMPTS - (entry.attempts + 1);
    return { valid: false, error: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
  }

  await OTP.deleteOne({ phone }); // one-time use
  return { valid: true };
}

module.exports = { generateOTP, verifyOTP };
