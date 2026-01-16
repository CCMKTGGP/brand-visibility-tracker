export const verificationEmailTemplate = (
  verificationLink: string,
  userEmail?: string,
  userName?: string
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

          .welcome-message {
            background-color: #f0f9ff;
            border: 1px solid #7dd3fc;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
          }

          .welcome-message .icon {
            font-size: 48px;
            margin-bottom: 16px;
          }

          .welcome-message h3 {
            color: #0c4a6e;
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 12px 0;
          }

          .welcome-message p {
            color: #0c4a6e;
            font-size: 16px;
            margin: 0;
            line-height: 1.5;
          }

          .verification-details {
            background-color: #f7fafc;
            border-left: 4px solid #636AE8;
            padding: 24px;
            margin: 32px 0;
            border-radius: 8px;
          }

          .verification-details h3 {
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

          .verification-steps {
            background-color: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
          }

          .verification-steps h3 {
            color: #14532d;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 16px 0;
            text-align: center;
          }

          .step {
            margin: 16px 0;
            color: #14532d;
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

          .benefits {
            background-color: #fefce8;
            border: 1px solid #fde047;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
          }

          .benefits h3 {
            color: #713f12;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 16px 0;
            text-align: center;
          }

          .benefit-item {
            display: flex;
            align-items: center;
            margin: 12px 0;
            color: #713f12;
            font-size: 15px;
          }

          .benefit-icon {
            color: #eab308;
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

            .step {
              align-items: flex-start;
            }

            .verification-steps, .benefits {
              padding: 20px;
            }

            .welcome-message .icon {
              font-size: 36px;
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
              <h1>📧 Verify Your Email Address</h1>
              
              <div class="welcome-message">
                <div class="icon">🎉</div>
                <h3>Welcome${userName ? `, ${userName}` : ""}!</h3>
                <p>Thank you for joining surfacemap.cc. You're just one step away from unlocking powerful brand analysis tools and insights.</p>
              </div>

              <p>
                We're excited to have you on board! To ensure the security of your account and enable all features, we need to verify your email address. This quick verification helps us protect your data and ensures you receive important updates about your brand analysis.
              </p>

              <div class="verification-details">
                <h3>📋 Verification Details</h3>
                ${
                  userEmail
                    ? `
                <div class="detail-item">
                  <span class="detail-label">Email Address:</span>
                  <span class="detail-value">${userEmail}</span>
                </div>`
                    : ""
                }
                <div class="detail-item">
                  <span class="detail-label">Account Status: </span>
                  <span class="detail-value">Pending Verification</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Registration Date: </span>
                  <span class="detail-value">${new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div class="verification-steps">
                <h3>✅ Quick Verification Process</h3>
                <div class="step">
                  <div class="step-number">1</div>
                  <div class="step-content">Click the "Verify My Email" button below</div>
                </div>
                <div class="step">
                  <div class="step-number">3</div>
                  <div class="step-content">You’ll be redirected securely to confirm your identity and create your first brand.</div>
                </div>
                <div class="step">
                  <div class="step-number">4</div>
                  <div class="step-content">Your dashboard will activate instantly. No setup required.</div>
                </div>
              </div>

              <div class="button-container">
                <a href="${verificationLink}" class="button">
                  ✨ Verify My Email Address
                </a>
              </div>

              <div class="benefits">
                <h3>🚀 What's waiting for you after verification:</h3>
                <div class="benefit-item">
                  <span class="benefit-icon">⭐</span>
                  <span>Full access to your surfacemap.cc dashboard.</span>
                </div>
                <div class="benefit-item">
                  <span class="benefit-icon">⭐</span>
                  <span>Real-time visibility tracking across AI models and funnel stages.</span>
                </div>
                <div class="benefit-item">
                  <span class="benefit-icon">⭐</span>
                  <span>Benchmark competitors at every stage and every AI model.</span>
                </div>
                <div class="benefit-item">
                  <span class="benefit-icon">⭐</span>
                  <span>Learn where LLMs are learning about you and your category.</span>
                </div>
                <div class="benefit-item">
                  <span class="benefit-icon">⭐</span>
                  <span>Track your brand’s funnel visibility for different value propositions, markets, and demographics.</span>
                </div>
              </div>

              <div class="expire-time">
                ⏰ <strong>Important:</strong> This verification link will expire in 30 minutes for security purposes. If the link expires, you can request a new verification email from the login page.
              </div>

              <p style="font-size: 14px; color: #718096; margin-top: 32px;">
                Having trouble with the button? Copy and paste this link into your browser:<br>
                <span style="word-break: break-all; color: #636AE8 !important;">${verificationLink}</span>
              </p>
            </div>

            <div class="footer">
              <p>
                <strong>Questions about verification?</strong> We're here to help!
              </p>
              <p>
                Contact us at <a href="mailto:help@surfacemap.cc">help@surfacemap.cc</a>
              </p>
              <p style="margin-top: 20px; font-size: 12px; color: #a0aec0;">
                This email was sent by surfacemap.cc - Full-Funnel AI Visibility. If you didn't create an account with us, please ignore this email.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};
