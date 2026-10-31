const nodemailer = require('nodemailer');

// Configure transport if SMTP credentials are provided
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send an OTP Email for 2FA, Signup verification, or Password reset
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.otp - 6-digit OTP code
 * @param {string} options.purpose - 'LOGIN' | 'SIGNUP' | 'RESET_PASSWORD'
 * @param {string} [options.userName] - Recipient's display name
 */
const sendOTPEmail = async ({ to, otp, purpose, userName }) => {
  const titles = {
    LOGIN: 'Login Two-Factor Authentication',
    SIGNUP: 'Verify Your Email Address',
    RESET_PASSWORD: 'Reset Your Password',
  };

  const descriptions = {
    LOGIN: 'Use the following verification code to complete your sign-in to Waseem AutoCare.',
    SIGNUP: 'Thank you for registering with Waseem AutoCare. Use the verification code below to verify your email and activate your account.',
    RESET_PASSWORD: 'We received a request to reset your password. Use the verification code below to proceed with setting a new password.',
  };

  const title = titles[purpose] || 'Verification Code';
  const description = descriptions[purpose] || 'Use the verification code below.';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
  <style>
  body { 
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
    background-color: #E8D2B5; 
    margin: 0; 
    padding: 20px; 
    color: #242424; 
  }
  .container { 
    max-width: 520px; 
    margin: 0 auto; 
    background: #F5EBDD; 
    border-radius: 14px; 
    border: 1px solid #D1C4B0; 
    overflow: hidden; 
    box-shadow: 0 4px 12px rgba(36, 36, 36, 0.08); 
  }
  .header { 
    background: #590907; 
    padding: 28px 24px; 
    text-align: center; 
  }
  .header h1 { 
    color: #FFFFFF; 
    margin: 0; 
    font-size: 22px; 
    font-weight: 700; 
    letter-spacing: -0.5px; 
  }
  .header p { 
    color: #E8D2B5; 
    margin: 6px 0 0 0; 
    font-size: 13px; 
    font-weight: 600; 
    text-transform: uppercase; 
    letter-spacing: 1px; 
  }
  .content { 
    padding: 32px 28px; 
    text-align: center; 
  }
  .greeting { 
    font-size: 16px; 
    font-weight: 600; 
    color: #242424; 
    margin-bottom: 12px; 
  }
  .desc { 
    font-size: 14px; 
    color: #625F56; 
    line-height: 1.6; 
    margin-bottom: 24px; 
  }
  .otp-box { 
    background: #FFFFFF; 
    border: 2px dashed #A5A79B; 
    border-radius: 12px; 
    padding: 18px 24px; 
    margin: 20px auto; 
    display: inline-block; 
  }
  .otp-code { 
    font-size: 34px; 
    font-weight: 800; 
    color: #590907; 
    letter-spacing: 8px; 
    font-family: 'Courier New', Courier, monospace; 
  }
  .expiry { 
    font-size: 13px; 
    color: #DC2626; 
    font-weight: 600; 
    margin-top: 16px; 
  }
  .footer { 
    background: #DDD9CC; 
    padding: 18px 24px; 
    text-align: center; 
    font-size: 12px; 
    color: #625F56; 
    border-top: 1px solid #D1C4B0; 
  }
</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Waseem AutoCare</h1>
          <p>${title}</p>
        </div>
        <div class="content">
          <div class="greeting">Hello${userName ? ' ' + userName : ''},</div>
          <div class="desc">${description}</div>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <div class="expiry">&#9200; This code will expire in 10 minutes.</div>
          <div class="desc" style="margin-top: 20px; font-size: 12px;">If you did not request this verification code, please ignore this email or contact support.</div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Waseem AutoCare Vehicle Service Management System.<br>Automated security notification.
        </div>
      </div>
    </body>
    </html>
  `;

  // Always log clearly to console for development and local testing
  console.log('\n============================================================');
  console.log(' [EMAIL SERVICE] OTP DISPATCHED');
  console.log(` To:      ${to}`);
  console.log(` Purpose: ${purpose} (${title})`);
  console.log(` OTP:     ${otp}`);
  console.log(' Expires: 10 minutes');
  console.log('============================================================\n');

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Waseem AutoCare" <no-reply@waseemautocare.com>',
        to,
        subject: `[Waseem AutoCare] ${title} - ${otp}`,
        text: `Your Waseem AutoCare verification code for ${title} is: ${otp}. It expires in 10 minutes.`,
        html,
      });
      console.log(`[EMAIL SERVICE] Email successfully dispatched via SMTP to ${to}`);
    } catch (err) {
      console.warn(`[EMAIL SERVICE] SMTP dispatch failed (console code remains valid):`, err.message);
    }
  }

  return { success: true, otp };
};

module.exports = {
  sendOTPEmail,
};
