const crypto = require('crypto');

// ── Generate a cryptographically secure 6-digit OTP ───────
module.exports.generateOTP = function() {
  // crypto.randomInt(min, max) — max is exclusive
  // range 100000–999999 guarantees always 6 digits
  return crypto.randomInt(100000, 1000000).toString();
};