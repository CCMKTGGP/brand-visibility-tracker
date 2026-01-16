export const resetPasswordEmailTemplate = (
  verificationLink: string,
  userEmail?: string
) => {
  return `
    <html>
      <head>
        <style>
          /* General styles */
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
            line-height: 1.6;
          }
            
          a {
            color: #fff !important;
            text-decoration: none;
          }

          .email-wrapper {
            background-color: #f8fafc;
            padding: 40px 20px;
          }
  
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
            overflow: hidden;
          }

          .header {
            background: linear-gradient(135deg, #636AE8 0%, #4F46E5 100%);
            padding: 40px 30px;
            text-align: center;
          }

          .logo {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            letter-spacing: -0.5px;
          }

          .header-subtitle {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            margin: 0;
          }

          .content {
            padding: 40px 30px;
          }
  
          h1 {
            color: #1a202c;
            font-size: 28px;
            font-weight: 700;
            text-align: center;
            margin: 0 0 24px 0;
            line-height: 1.3;
          }

          .security-notice {
            background-color: #fef5e7;
            border: 1px solid #f6e05e;
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
            text-align: center;
          }

          .security-notice .icon {
            font-size: 32px;
            margin-bottom: 12px;
          }

          .security-notice h3 {
            color: #744210;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 8px 0;
          }

          .security-notice p {
            color: #744210;
            font-size: 14px;
            margin: 0;
            line-height: 1.5;
          }

          .request-details {
            background-color: #f7fafc;
            border-left: 4px solid #636AE8;
            padding: 24px;
            margin: 32px 0;
            border-radius: 8px;
          }

          .request-details h3 {
            color: #2d3748;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 16px 0;
          }

          .detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
          }

          .detail-item:last-child {
            border-bottom: none;
          }

          .detail-label {
            color: #718096;
            font-size: 14px;
            font-weight: 500;
          }

          .detail-value {
            color: #2d3748;
            font-size: 14px;
            font-weight: 600;
          }
  
          p {
            color: #4a5568;
            font-size: 16px;
            line-height: 1.6;
            text-align: center;
            margin: 16px 0;
          }

          .instructions {
            background-color: #f0f9ff;
            border: 1px solid #7dd3fc;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
          }

          .instructions h3 {
            color: #0c4a6e;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 16px 0;
            text-align: center;
          }

          .step {
            margin: 16px 0;
            color: #0c4a6e;
            font-size: 15px;
            overflow: hidden;
            zoom: 1;
          }

          .step-content {
            margin-left: 36px;
            display: block;
          }

          .step-number {
            background-color: #636AE8;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: inline-block;
            text-align: center;
            line-height: 24px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 12px;
            vertical-align: top;
            float: left;
          }
  
          /* Button style */
          .button-container {
            text-align: center;
            margin: 40px 0;
          }

          .button {
            display: inline-block;
            padding: 16px 32px;
            background: linear-gradient(135deg, #636AE8 0%, #4F46E5 100%);
            color: #ffffff !important;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 12px;
            text-align: center;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(99, 106, 232, 0.3);
          }

          .button:hover {
            background: linear-gradient(135deg, #4F46E5 0%, #4338CA 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(99, 106, 232, 0.4);
          }

          /* Expiry time text */
          .expire-time {
            background-color: #fee2e2;
            border: 1px solid #fca5a5;
            border-radius: 8px;
            padding: 16px;
            font-size: 14px;
            color: #991b1b;
            text-align: center;
            margin: 32px 0;
          }

          .expire-time strong {
            color: #7f1d1d;
          }

          .security-tips {
            background-color: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
          }

          .security-tips h3 {
            color: #14532d;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 16px 0;
            text-align: center;
          }

          .tip {
            display: flex;
            align-items: flex-start;
            margin: 12px 0;
            color: #14532d;
            font-size: 14px;
          }

          .tip-icon {
            color: #22c55e;
            margin-right: 8px;
            font-weight: bold;
            flex-shrink: 0;
          }

          .footer {
            background-color: #f7fafc;
            padding: 32px 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }

          .footer p {
            color: #718096;
            font-size: 14px;
            margin: 8px 0;
          }

          .footer a {
            color: #636AE8 !important;
            text-decoration: none;
          }

          .footer a:hover {
            text-decoration: underline;
          }

          /* Mobile responsiveness */
          @media (max-width: 600px) {
            .email-wrapper {
              padding: 20px 10px;
            }

            .container {
              border-radius: 12px;
            }

            .header, .content, .footer {
              padding: 24px 20px;
            }

            h1 {
              font-size: 24px;
            }

            .button {
              padding: 14px 28px;
              font-size: 15px;
            }

            .detail-item {
              flex-direction: column;
              align-items: flex-start;
              gap: 4px;
            }

            .step {
              align-items: flex-start;
            }

            .instructions, .security-tips {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header">
              <div class="logo">Surfacemap.cc</div>
              <p class="header-subtitle">Track how AI models describe your brand across every stage of the buyer journey</p>
            </div>
            
            <div class="content">
              <h1>🔒 Password Reset Request</h1>
              
              <div class="security-notice">
                <div class="icon">🛡️</div>
                <h3>Security Notice</h3>
                <p>We received a request to reset your password. If you didn't make this request, please ignore this email and your password will remain unchanged.</p>
              </div>

              <p>
                Don't worry! Password resets happen to the best of us. We've received your request to reset your password for your surfacemap.cc account, and we're here to help you get back to analyzing your brand's performance.
              </p>

              <div class="request-details">
                <h3>📋 Reset Request Details</h3>
                ${
                  userEmail
                    ? `
                <div class="detail-item">
                  <span class="detail-label">Account Email:</span>
                  <span class="detail-value">${userEmail}</span>
                </div>`
                    : ""
                }
                <div class="detail-item">
                  <span class="detail-label">Request Time: </span>
                  <span class="detail-value">${new Date().toLocaleString()}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Request Type: </span>
                  <span class="detail-value">Password Reset</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Status: </span>
                  <span class="detail-value">Pending Verification</span>
                </div>
              </div>

              <div class="instructions">
                <h3>📝 How to Reset Your Password</h3>
                <div class="step">
                  <div class="step-number">1</div>
                  <div class="step-content">Click the "Reset Password" button below to access the secure reset page</div>
                </div>
                <div class="step">
                  <div class="step-number">2</div>
                  <div class="step-content">Enter your new password (must be at least 8 characters long)</div>
                </div>
                <div class="step">
                  <div class="step-number">3</div>
                  <div class="step-content">Confirm your new password and save the changes</div>
                </div>
                <div class="step">
                  <div class="step-number">4</div>
                  <div class="step-content">Log in with your new password and continue using the platform</div>
                </div>
              </div>

              <div class="button-container">
                <a href="${verificationLink}" class="button">
                  🔑 Reset My Password
                </a>
              </div>

              <div class="expire-time">
                ⏰ <strong>Important:</strong> This password reset link will expire in 30 minutes for security purposes. If you need more time, simply request another password reset from the login page.
              </div>

              <div class="security-tips">
                <h3>🔐 Password Security Tips</h3>
                <div class="tip">
                  <span class="tip-icon">✓</span>
                  <span>Use a combination of uppercase and lowercase letters, numbers, and symbols</span>
                </div>
                <div class="tip">
                  <span class="tip-icon">✓</span>
                  <span>Make your password at least 12 characters long for better security</span>
                </div>
                <div class="tip">
                  <span class="tip-icon">✓</span>
                  <span>Avoid using personal information like birthdays or names</span>
                </div>
                <div class="tip">
                  <span class="tip-icon">✓</span>
                  <span>Consider using a password manager to generate and store secure passwords</span>
                </div>
                <div class="tip">
                  <span class="tip-icon">✓</span>
                  <span>Never share your password with anyone or use the same password across multiple sites</span>
                </div>
              </div>
            </div>

            <div class="footer">
              <p>
                <strong>Need help?</strong> Our support team is available 24/7.
              </p>
              <p>
                Contact us at <a href="mailto:help@surfacemap.cc">help@surfacemap.cc</a>
              </p>
              <p style="margin-top: 20px; font-size: 12px; color: #a0aec0;">
                This email was sent by surfacemap.cc - Full-Funnel AI Visibility. If you didn't request a password reset, please contact our support team immediately.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};
