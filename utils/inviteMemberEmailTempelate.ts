export const inviteMemberEmailTemplate = (
  verificationLink: string,
  brandName?: string,
  inviterName?: string
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

          .welcome-text {
            color: #4a5568;
            font-size: 18px;
            text-align: center;
            margin-bottom: 32px;
            line-height: 1.6;
          }

          .invitation-details {
            background-color: #f7fafc;
            border-left: 4px solid #636AE8;
            padding: 24px;
            margin: 32px 0;
            border-radius: 8px;
          }

          .invitation-details h3 {
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

          .features-list {
            background-color: #f7fafc;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
          }

          .features-list h3 {
            color: #2d3748;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 16px 0;
            text-align: center;
          }

          .feature-item {
            display: flex;
            align-items: center;
            margin: 12px 0;
            color: #4a5568;
            font-size: 15px;
          }

          .feature-icon {
            color: #636AE8;
            margin-right: 12px;
            font-weight: bold;
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
            color: #ffffff;
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

          .secondary-button {
            display: inline-block;
            padding: 12px 24px;
            background-color: transparent;
            color: #636AE8;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            border: 2px solid #636AE8;
            border-radius: 8px;
            margin-top: 16px;
            transition: all 0.3s ease;
          }

          .secondary-button:hover {
            background-color: #636AE8;
            color: #ffffff;
          }

          /* Expiry time text */
          .expire-time {
            background-color: #fef5e7;
            border: 1px solid #f6e05e;
            border-radius: 8px;
            padding: 16px;
            font-size: 14px;
            color: #744210;
            text-align: center;
            margin: 32px 0;
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

            .features-list {
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
              <h1>🎉 You're Invited!</h1>
              
              <p class="welcome-text">
                ${
                  inviterName
                    ? `${inviterName} has invited you`
                    : "You have been invited"
                } to join ${
    brandName ? `<strong>${brandName}</strong>` : "a brand"
  } on surfacemap.cc, the leading platform for comprehensive brand analysis and visibility tracking.
              </p>

              <div class="invitation-details">
                <h3>📋 Invitation Details</h3>
                ${
                  brandName
                    ? `
                <div class="detail-item">
                  <span class="detail-label">Brand Name:</span>
                  <span class="detail-value">${brandName}</span>
                </div>`
                    : ""
                }
                ${
                  inviterName
                    ? `
                <div class="detail-item">
                  <span class="detail-label">Invited by:</span>
                  <span class="detail-value">${inviterName}</span>
                </div>`
                    : ""
                }
                <div class="detail-item">
                  <span class="detail-label">Role:</span>
                  <span class="detail-value">Team Member</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Access Level:</span>
                  <span class="detail-value">Full Dashboard Access</span>
                </div>
              </div>

              <div class="features-list">
                <h3>🚀 What you'll get access to:</h3>
                <div class="feature-item">
                  <span class="feature-icon">✓</span>
                  <span>Real-time brand visibility analytics and insights</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">✓</span>
                  <span>Comprehensive brand performance dashboards</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">✓</span>
                  <span>Advanced reporting and data visualization tools</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">✓</span>
                  <span>Collaborative team workspace and sharing features</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">✓</span>
                  <span>Automated analysis and performance tracking</span>
                </div>
              </div>

              <p>
                To get started, simply click the button below to accept your invitation and create your secure account. You'll be able to set up your password and start exploring your brand's performance data immediately.
              </p>

              <div class="button-container">
                <a href="${verificationLink}" class="button">
                  Accept Invitation & Get Started
                </a>
              </div>

              <div class="expire-time">
                ⏰ <strong>Important:</strong> This invitation link will expire in 7 days for security purposes. Please accept your invitation soon to avoid any delays in accessing your brand dashboard.
              </div>
            </div>

            <div class="footer">
              <p>
                <strong>Need help?</strong> Our support team is here to assist you.
              </p>
              <p>
                Contact us at <a href="mailto:help@surfacemap.cc">help@surfacemap.cc</a>
              </p>
              <p style="margin-top: 20px; font-size: 12px; color: #a0aec0;">
                This email was sent by surfacemap.cc - Full-Funnel AI Visibility. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};
