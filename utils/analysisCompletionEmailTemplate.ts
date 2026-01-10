export const analysisCompletionEmailTemplate = (
  brandName: string,
  dashboardLink: string,
  analysisResults: {
    totalAnalyses: number;
    averageScore: number;
    averageWeightedScore: number;
    completionTime: number;
  },
  userName?: string
) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "#22c55e"; // Green
    if (score >= 60) return "#eab308"; // Yellow
    if (score >= 40) return "#f97316"; // Orange
    return "#ef4444"; // Red
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 80) return "🎯";
    if (score >= 60) return "📈";
    if (score >= 40) return "⚡";
    return "🔍";
  };

  const getPerformanceInsight = (score: number) => {
    if (score >= 80)
      return "Excellent performance! Your brand visibility is strong across all analyzed areas.";
    if (score >= 60)
      return "Good performance with room for improvement in specific areas.";
    if (score >= 40)
      return "Moderate performance. Consider focusing on key optimization opportunities.";
    return "Significant opportunities for improvement identified. Let's work on enhancing your brand visibility.";
  };

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

          .celebration-banner {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid #7dd3fc;
            border-radius: 16px;
            padding: 32px;
            margin: 24px 0;
            text-align: center;
          }

          .celebration-banner .icon {
            font-size: 64px;
            margin-bottom: 16px;
          }

          .celebration-banner h2 {
            color: #0c4a6e;
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 12px 0;
          }

          .celebration-banner p {
            color: #0c4a6e;
            font-size: 18px;
            margin: 0;
            font-weight: 500;
          }

          .brand-info {
            background-color: #f7fafc;
            border-left: 4px solid #636AE8;
            padding: 24px;
            margin: 32px 0;
            border-radius: 8px;
          }

          .brand-info h3 {
            color: #2d3748;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 16px 0;
          }

          .brand-detail {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
          }

          .brand-detail:last-child {
            border-bottom: none;
          }

          .brand-label {
            color: #718096;
            font-size: 14px;
            font-weight: 500;
          }

          .brand-value {
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

          /* Results summary */
          .results-summary {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 16px;
            padding: 32px;
            margin: 32px 0;
            border: 1px solid #e2e8f0;
          }

          .results-summary h3 {
            color: #1a202c;
            font-size: 22px;
            font-weight: 700;
            margin: 0 0 24px 0;
            text-align: center;
          }

          .metric-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
          }

          .metric-card {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
          }

          .metric-icon {
            font-size: 32px;
            margin-bottom: 8px;
          }

          .metric-value {
            font-size: 28px;
            font-weight: 700;
            margin: 8px 0 4px 0;
          }

          .metric-label {
            color: #718096;
            font-size: 14px;
            font-weight: 500;
            margin: 0;
          }

          .score-highlight {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 2px solid #f59e0b;
            border-radius: 16px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
          }

          .score-highlight .score {
            font-size: 48px;
            font-weight: 800;
            margin: 8px 0;
          }

          .score-highlight h4 {
            color: #92400e;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 8px 0;
          }

          .score-highlight p {
            color: #92400e;
            font-size: 16px;
            margin: 0;
            font-weight: 500;
          }

          .insights-section {
            background-color: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
          }

          .insights-section h3 {
            color: #14532d;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 16px 0;
            text-align: center;
          }

          .insight-item {
            display: flex;
            align-items: flex-start;
            margin: 16px 0;
            color: #14532d;
            font-size: 15px;
          }

          .insight-icon {
            color: #22c55e;
            margin-right: 12px;
            font-weight: bold;
            flex-shrink: 0;
          }

          /* Button style */
          .button-container {
            text-align: center;
            margin: 40px 0;
          }

          .button {
            display: inline-block;
            padding: 18px 36px;
            background: linear-gradient(135deg, #636AE8 0%, #4F46E5 100%);
            color: #ffffff;
            font-size: 18px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 12px;
            text-align: center;
            transition: all 0.3s ease;
            box-shadow: 0 6px 16px rgba(99, 106, 232, 0.3);
          }

          .button:hover {
            background: linear-gradient(135deg, #4F46E5 0%, #4338CA 100%);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(99, 106, 232, 0.4);
          }

          .secondary-actions {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-top: 24px;
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
            transition: all 0.3s ease;
          }

          .secondary-button:hover {
            background-color: #636AE8;
            color: #ffffff;
          }

          .next-steps {
            background-color: #fef5e7;
            border: 1px solid #f6e05e;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
          }

          .next-steps h3 {
            color: #744210;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 16px 0;
            text-align: center;
          }

          .step-item {
            margin: 12px 0;
            color: #744210;
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
              padding: 16px 32px;
              font-size: 16px;
            }

            .metric-grid {
              grid-template-columns: 1fr;
              gap: 16px;
            }

            .brand-detail {
              flex-direction: column;
              align-items: flex-start;
              gap: 4px;
            }

            .secondary-actions {
              flex-direction: column;
              align-items: center;
            }

            .celebration-banner .icon {
              font-size: 48px;
            }

            .celebration-banner h2 {
              font-size: 20px;
            }

            .score-highlight .score {
              font-size: 36px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header">
              <div class="logo">GEOStatus.cc</div>
              <p class="header-subtitle">Track how AI models describe your brand across every stage of the buyer journey</p>
            </div>
            
            <div class="content">
              <h1>🎉 Analysis Complete!</h1>
              
              <div class="celebration-banner">
                <div class="icon">🚀</div>
                <h2>Your Brand Analysis is Ready${
                  userName ? `, ${userName}` : ""
                }!</h2>
                <p>We've successfully completed a comprehensive analysis of <strong>${brandName}</strong> and the results are now available in your dashboard.</p>
              </div>

              <div class="brand-info">
                <h3>📊 Analysis Summary</h3>
                <div class="brand-detail">
                  <span class="brand-label">Brand Analyzed: </span>
                  <span class="brand-value">${brandName}</span>
                </div>
                <div class="brand-detail">
                  <span class="brand-label">Analysis Date: </span>
                  <span class="brand-value">${new Date().toLocaleDateString()}</span>
                </div>
                <div class="brand-detail">
                  <span class="brand-label">Processing Time: </span>
                  <span class="brand-value">${Math.round(
                    analysisResults.completionTime / 1000
                  )} seconds</span>
                </div>
                <div class="brand-detail">
                  <span class="brand-label">Analysis Type: </span>
                  <span class="brand-value">Comprehensive Brand Visibility</span>
                </div>
              </div>

              <div class="results-summary">
                <h3>📈 Key Performance Metrics</h3>
                
                <div class="metric-grid">
                  <div class="metric-card">
                    <div class="metric-icon">📊</div>
                    <div class="metric-value" style="color: #636AE8;">${
                      analysisResults.totalAnalyses
                    }</div>
                    <div class="metric-label">Total Analyses</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-icon">⏱️</div>
                    <div class="metric-value" style="color: #636AE8;">${Math.round(
                      analysisResults.completionTime / 1000
                    )}s</div>
                    <div class="metric-label">Processing Time</div>
                  </div>
                </div>

                <div class="score-highlight">
                  <h4>${getScoreEmoji(
                    analysisResults.averageScore
                  )} Overall Performance Score</h4>
                  <div class="score" style="color: ${getScoreColor(
                    analysisResults.averageScore
                  )};">
                    ${analysisResults.averageScore}%
                  </div>
                  <p>${getPerformanceInsight(analysisResults.averageScore)}</p>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; background-color: #ffffff; border-radius: 12px; padding: 20px; margin-top: 20px; border: 1px solid #e2e8f0;">
                  <div style="text-align: center; flex: 1;">
                    <div style="color: ${getScoreColor(
                      analysisResults.averageWeightedScore
                    )}; font-size: 24px; font-weight: 700;">${
    analysisResults.averageWeightedScore
  }%</div>
                    <div style="color: #718096; font-size: 14px; font-weight: 500;">Weighted Score</div>
                  </div>
                  <div style="width: 1px; height: 40px; background-color: #e2e8f0; margin: 0 20px;"></div>
                  <div style="text-align: center; flex: 1;">
                    <div style="color: #636AE8; font-size: 24px; font-weight: 700;">${
                      analysisResults.totalAnalyses
                    }</div>
                    <div style="color: #718096; font-size: 14px; font-weight: 500;">Data Points</div>
                  </div>
                </div>
              </div>

              <div class="insights-section">
                <h3>💡 Key Insights & Recommendations</h3>
                <div class="insight-item">
                  <span class="insight-icon">✓</span>
                  <span>Comprehensive analysis across ${
                    analysisResults.totalAnalyses
                  } different brand visibility factors</span>
                </div>
                <div class="insight-item">
                  <span class="insight-icon">✓</span>
                  <span>Performance benchmarking against industry standards and best practices</span>
                </div>
                <div class="insight-item">
                  <span class="insight-icon">✓</span>
                  <span>Detailed breakdown of strengths and areas for improvement</span>
                </div>
                <div class="insight-item">
                  <span class="insight-icon">✓</span>
                  <span>Actionable recommendations to enhance your brand's visibility</span>
                </div>
                <div class="insight-item">
                  <span class="insight-icon">✓</span>
                  <span>Historical trend analysis and performance tracking</span>
                </div>
              </div>

              <p style="font-size: 18px; font-weight: 500; color: #2d3748;">
                Your detailed analysis report includes interactive charts, trend analysis, competitive insights, and personalized recommendations to help you optimize your brand's visibility strategy.
              </p>

              <div class="button-container">
                <a href="${dashboardLink}" class="button">
                  🎯 View Complete Analysis Report
                </a>
              </div>

              <div class="next-steps">
                <h3>🎯 Recommended Next Steps</h3>
                <div class="step-item">
                  <div class="step-number">1</div>
                  <div class="step-content">Review your detailed analysis report and key performance indicators</div>
                </div>
                <div class="step-item">
                  <div class="step-number">2</div>
                  <div class="step-content">Identify top priority areas for improvement based on our recommendations</div>
                </div>
                <div class="step-item">
                  <div class="step-number">3</div>
                  <div class="step-content">Implement suggested optimizations to enhance brand visibility</div>
                </div>
                <div class="step-item">
                  <div class="step-number">4</div>
                  <div class="step-content">Schedule regular analysis to track progress and maintain performance</div>
                </div>
              </div>
            </div>

            <div class="footer">
              <p>
                <strong>Questions about your analysis?</strong> Our expert team is ready to help you interpret your results and develop an action plan.
              </p>
              <p>
                Contact us at <a href="mailto:help@geostatus.cc">help@geostatus.cc</a>
              </p>
              <p style="margin-top: 20px; font-size: 12px; color: #a0aec0;">
                This analysis was automatically generated by GEOStatus.cc's AI-powered analysis engine. Results are based on current data and industry benchmarks.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};
