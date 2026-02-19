/**
 * Mock OTP store (in-memory).
 *
 * Replace `generateOTP` with a real SMS provider (e.g. Twilio Verify) in production.
 * The rest of the interface stays the same.
 */

const otpStore = new Map(); // phone → { otp, expiresAt }

function getTTLMs() {
  return (parseInt(process.env.OTP_TTL_MINUTES, 10) || 5) * 60 * 1000;
}

/**
 * Generate and "send" a 6-digit OTP for the given phone number.
 * Returns the OTP string (only needed for dev/testing).
 */
function generateOTP(phone) {
  const otp       = Math.floor(100_000 + Math.random() * 900_000).toString();
  const expiresAt = Date.now() + getTTLMs();

  otpStore.set(phone, { otp, expiresAt });

  // TODO: replace with Twilio / AWS SNS SMS call in production
  console.log(`[DEV] OTP for ${phone}: ${otp}`);

  return otp;
}

/**
 * Verify the OTP for the given phone.
 * Deletes the entry on success or expiry.
 * Returns true if valid, false otherwise.
 */
function verifyOTP(phone, code) {
  const entry = otpStore.get(phone);
  if (!entry) return false;

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return false;
  }

  if (entry.otp !== code) return false;

  otpStore.delete(phone); // one-time use
  return true;
}

module.exports = { generateOTP, verifyOTP };
