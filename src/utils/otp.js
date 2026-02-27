const OTP = require('../models/OTP');

const MAX_ATTEMPTS = 5;

function getTTLMs() {
  return (parseInt(process.env.OTP_TTL_MINUTES, 10) || 5) * 60 * 1000;
}

/**
 * Send OTP via Twilio SMS if credentials are configured.
 * Falls back to console.log in dev mode.
 */
async function sendSMS(phone, otp) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    // Dev mode — print OTP to server logs
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    return;
  }

  try {
    const twilio = require('twilio')(accountSid, authToken);
    await twilio.messages.create({
      body: `Your CareNearby verification code is: ${otp}\n\nValid for 5 minutes. Do not share this code.\n\nCareNearby · Sudbury, ON`,
      from,
      to: phone,
    });
    console.log(`[SMS] OTP sent to ${phone}`);
  } catch (err) {
    console.error('[SMS] Twilio failed:', err.message);
    // Fallback so dev/test can still proceed
    console.log(`[FALLBACK] OTP for ${phone}: ${otp}`);
  }
}

/**
 * Generate and store a 6-digit OTP for the given phone number.
 * Replaces any existing OTP for that phone, then sends via SMS.
 */
async function generateOTP(phone) {
  const otp       = Math.floor(100_000 + Math.random() * 900_000).toString();
  const expiresAt = new Date(Date.now() + getTTLMs());

  await OTP.findOneAndUpdate(
    { phone },
    { otp, expiresAt, attempts: 0 },
    { upsert: true, new: true }
  );

  console.log(`[OTP] ${phone} → ${otp}`);
  await sendSMS(phone, otp);

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
