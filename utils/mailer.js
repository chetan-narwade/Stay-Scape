const nodemailer = require('nodemailer');

// ── Transporter ────────────────────────────────────────────
// ✅ FIX: Use host/port/secure instead of service:'gmail'
//    service:'gmail' uses the system certificate chain which
//    causes "self-signed certificate" errors in some environments.
//    Direct SMTP config bypasses that issue.
const transporter = nodemailer.createTransport({
  host:   'smtp.gmail.com',
  port:   465,
  secure: true,           // true for port 465 (SSL)
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS  // Gmail App Password — not your real password
  },
  tls: {
    rejectUnauthorized: false   // ✅ FIX: bypasses self-signed cert error
  }
});

// ── Verify connection on startup ───────────────────────────
transporter.verify(function(err) {
  if (err) {
    console.error('❌  Mailer connection failed:', err.message);
  } else {
    console.log('✅  Mailer ready');
  }
});

// ── Send OTP ───────────────────────────────────────────────
module.exports.sendOTP = async function(email, otp) {

  if (!email || !otp) {
    throw new Error('Email and OTP are required');
  }

  const mailOptions = {
    from:    `"StayScape" <${process.env.GMAIL_USER}>`,
    to:      email,
    subject: 'Your StayScape OTP — expires in 10 minutes',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#080706;">
          <table width="100%" cellpadding="0" cellspacing="0"
            style="font-family:'DM Sans',sans-serif;max-width:480px;margin:40px auto;">
            <tr>
              <td style="background:#0E0D0B;border-radius:16px;border:1px solid rgba(196,164,107,.15);overflow:hidden;">

                <!-- Header -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:32px 36px 24px;border-bottom:1px solid rgba(196,164,107,.1);">
                      <p style="margin:0 0 4px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#C4A46B;">
                        StayScape
                      </p>
                      <h1 style="margin:0;font-size:24px;font-weight:300;color:#F5F0E6;line-height:1.2;">
                        Your one-time password
                      </h1>
                    </td>
                  </tr>
                </table>

                <!-- OTP Box -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:32px 36px;">
                      <p style="margin:0 0 20px;font-size:14px;color:#9E9B96;">
                        Use the code below to sign in to your StayScape account.
                      </p>

                      <!-- OTP -->
                      <div style="
                        background:#1C1917;
                        border:1px solid rgba(196,164,107,.2);
                        border-radius:12px;
                        padding:24px;
                        text-align:center;
                        margin-bottom:24px;
                      ">
                        <span style="
                          font-size:42px;
                          font-weight:700;
                          letter-spacing:14px;
                          color:#C4A46B;
                          line-height:1;
                        ">${otp}</span>
                      </div>

                      <!-- Expiry warning -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="
                            background:rgba(248,113,113,.06);
                            border:1px solid rgba(248,113,113,.18);
                            border-radius:8px;
                            padding:12px 16px;
                          ">
                            <p style="margin:0;font-size:12px;color:#F87171;">
                              ⏱ This code expires in <strong>10 minutes</strong>.
                              Do not share it with anyone.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:24px 0 0;font-size:12px;color:#6E6B66;line-height:1.6;">
                        If you didn't request this code, you can safely ignore this email.
                        Your account is secure.
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Footer -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="
                      padding:16px 36px;
                      border-top:1px solid rgba(196,164,107,.1);
                      text-align:center;
                    ">
                      <p style="margin:0;font-size:11px;color:#6E6B66;">
                        © ${new Date().getFullYear()} StayScape · Secure login
                      </p>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>
        </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (err) {
    throw new Error('Failed to send OTP email. Please try again.');
  }
};