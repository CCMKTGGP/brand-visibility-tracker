import { AIModel, AnalysisStage } from "@/types/brand";

// Simple mock AI service - you can replace with actual API calls
export class AIService {
  // Mock API endpoints - replace with actual AI service URLs
  private static readonly AI_ENDPOINTS = {
    ChatGPT:
      process.env.OPENAI_API_URL ||
      "https://api.openai.com/v1/chat/completions",
    Claude:
      process.env.CLAUDE_API_URL || "https://api.anthropic.com/v1/messages",
    Gemini:
      process.env.GEMINI_API_URL ||
      "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent",
  };

  private static readonly API_KEYS = {
    ChatGPT: process.env.OPENAI_API_KEY,
    Claude: process.env.CLAUDE_API_KEY,
    Gemini: process.env.GEMINI_API_KEY,
  };

  // Generate a brand analysis prompt based on brand data and stage
  private static generatePrompt(brandData: any, stage: AnalysisStage): string {
    const stageDescriptions = {
      TOFU: "Top of Funnel - Awareness and Discovery",
      MOFU: "Middle of Funnel - Consideration and Evaluation",
      BOFU: "Bottom of Funnel - Decision and Purchase",
      EVFU: "Extended Value Funnel - Retention and Advocacy",
    };

    return `
Analyze the brand "${brandData.name}" for ${
      stageDescriptions[stage]
    } performance.

Brand Details:
- Name: ${brandData.name}
- Category: ${brandData.category || "Not specified"}
- Region: ${brandData.region || "Global"}
- Target Audience: ${brandData.target_audience?.join(", ") || "Not specified"}
- Competitors: ${brandData.competitors?.join(", ") || "Not specified"}
- Key Features: ${brandData.feature_list?.join(", ") || "Not specified"}
- Use Case: ${brandData.use_case || "Not specified"}

Please provide:
1. A score from 0-100 for ${stage} performance
2. Specific recommendations for improvement
3. Sentiment analysis (positive/neutral/negative)
4. Key insights for this funnel stage

Focus on ${stage} specific metrics and strategies.`;
  }

  // Analyze sentiment from AI response
  private static analyzeSentiment(response: string): {
    overall: "positive" | "neutral" | "negative";
    confidence: number;
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
      strongly_positive: number;
    };
  } {
    const positiveWords = [
      "excellent",
      "great",
      "good",
      "strong",
      "positive",
      "outstanding",
      "impressive",
      "effective",
    ];
    const negativeWords = [
      "poor",
      "weak",
      "bad",
      "negative",
      "concerning",
      "inadequate",
      "problematic",
    ];

    const words = response.toLowerCase().split(/\s+/);
    const positiveCount = words.filter((word) =>
      positiveWords.some((pos) => word.includes(pos))
    ).length;
    const negativeCount = words.filter((word) =>
      negativeWords.some((neg) => word.includes(neg))
    ).length;

    const totalSentimentWords = positiveCount + negativeCount;
    const confidence = Math.min((totalSentimentWords / words.length) * 100, 95);

    let overall: "positive" | "neutral" | "negative" = "neutral";
    if (positiveCount > negativeCount) overall = "positive";
    else if (negativeCount > positiveCount) overall = "negative";

    // Generate distribution percentages
    const stronglyPositive = positiveCount > negativeCount * 2 ? 15 : 5;
    const positive = overall === "positive" ? 60 - stronglyPositive : 25;
    const neutral = overall === "neutral" ? 60 : 25;
    const negative = overall === "negative" ? 60 : 10;

    return {
      overall,
      confidence: Math.round(confidence),
      distribution: {
        positive,
        neutral,
        negative,
        strongly_positive: stronglyPositive,
      },
    };
  }

  // Extract score from AI response
  private static extractScore(response: string): number {
    // Look for patterns like "Score: 85" or "85/100" or "Rate: 7.5/10"
    const scorePatterns = [
      /score[:\s]+(\d+)/i,
      /(\d+)\/100/i,
      /(\d+)\s*out\s*of\s*100/i,
      /rate[:\s]+(\d+(?:\.\d+)?)\/10/i,
    ];

    for (const pattern of scorePatterns) {
      const match = response.match(pattern);
      if (match) {
        let score = parseFloat(match[1]);
        // Convert 0-10 scale to 0-100
        if (response.includes("/10")) {
          score = score * 10;
        }
        return Math.min(Math.max(score, 0), 100);
      }
    }

    // If no explicit score found, generate based on sentiment
    const sentiment = this.analyzeSentiment(response);
    if (sentiment.overall === "positive") return 75 + Math.random() * 20;
    if (sentiment.overall === "negative") return 20 + Math.random() * 30;
    return 45 + Math.random() * 20;
  }

  // Call ChatGPT API
  private static async callChatGPT(prompt: string): Promise<{
    response: string;
    responseTime: number;
  }> {
    const startTime = Date.now();
    if (this.API_KEYS.ChatGPT) {
      try {
        const response = await fetch(this.AI_ENDPOINTS.ChatGPT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.API_KEYS.ChatGPT}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
          }),
        });

        const data = await response.json();
        return {
          response: data.choices[0].message.content,
          responseTime: Date.now() - startTime,
        };
      } catch (error) {
        throw new Error(`ChatGPT API error: ${error}`);
      }
    }
    return {
      response: "",
      responseTime: 0,
    };
  }

  // Call Claude API
  private static async callClaude(prompt: string): Promise<{
    response: string;
    responseTime: number;
  }> {
    const startTime = Date.now();
    if (this.API_KEYS.Claude) {
      try {
        const response = await fetch(this.AI_ENDPOINTS.Claude, {
          method: "POST",
          headers: {
            "x-api-key": this.API_KEYS.Claude,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-sonnet-20240229",
            max_tokens: 500,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        const data = await response.json();
        return {
          response: data.content[0].text,
          responseTime: Date.now() - startTime,
        };
      } catch (error) {
        throw new Error(`Claude API error: ${error}`);
      }
    }
    return {
      response: "",
      responseTime: 0,
    };
  }

  // Call Gemini API
  private static async callGemini(prompt: string): Promise<{
    response: string;
    responseTime: number;
  }> {
    const startTime = Date.now();
    if (this.API_KEYS.Gemini) {
      try {
        const response = await fetch(
          `${this.AI_ENDPOINTS.Gemini}?key=${this.API_KEYS.Gemini}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.7,
              },
            }),
          }
        );

        const data = await response.json();
        return {
          response: data.candidates[0].content.parts[0].text,
          responseTime: Date.now() - startTime,
        };
      } catch (error) {
        throw new Error(`Gemini API error: ${error}`);
      }
    }
    return {
      response: "",
      responseTime: 0,
    };
  }

  // Main analysis function
  public static async analyzeBrand(
    brandData: any,
    model: AIModel,
    stage: AnalysisStage,
    customPrompt?: string
  ): Promise<{
    score: number;
    response: string;
    responseTime: number;
    successRate: number;
    sentiment: {
      overall: "positive" | "neutral" | "negative";
      confidence: number;
      distribution: {
        positive: number;
        neutral: number;
        negative: number;
        strongly_positive: number;
      };
    };
    status: "success" | "error" | "warning";
  }> {
    try {
      const prompt = customPrompt || this.generatePrompt(brandData, stage);
      let result;

      switch (model) {
        case "ChatGPT":
          result = await this.callChatGPT(prompt);
          break;
        case "Claude":
          result = await this.callClaude(prompt);
          break;
        case "Gemini":
          result = await this.callGemini(prompt);
          break;
        default:
          throw new Error(`Unsupported AI model: ${model}`);
      }

      const score = this.extractScore(result.response);
      const sentiment = this.analyzeSentiment(result.response);

      // Calculate success rate based on response quality
      const successRate = result.response.length > 50 ? 95 : 85;

      return {
        score,
        response: result.response,
        responseTime: result.responseTime,
        successRate,
        sentiment,
        status: "success",
      };
    } catch (error) {
      console.error(`AI Analysis Error for ${model}:`, error);

      // Return error response
      return {
        score: 0,
        response: `Analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        responseTime: 0,
        successRate: 0,
        sentiment: {
          overall: "negative",
          confidence: 90,
          distribution: {
            positive: 5,
            neutral: 15,
            negative: 75,
            strongly_positive: 5,
          },
        },
        status: "error",
      };
    }
  }

  // Batch analysis for all models and stages
  public static async batchAnalyzeBrand(
    brandData: any,
    models: AIModel[] = ["ChatGPT", "Claude", "Gemini"],
    stages: AnalysisStage[] = ["TOFU", "MOFU", "BOFU", "EVFU"]
  ): Promise<
    Array<{
      model: AIModel;
      stage: AnalysisStage;
      result: Awaited<ReturnType<typeof AIService.analyzeBrand>>;
    }>
  > {
    const analyses = [];

    for (const model of models) {
      for (const stage of stages) {
        try {
          const result = await this.analyzeBrand(brandData, model, stage);
          analyses.push({ model, stage, result });

          // Add small delay between requests to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Batch analysis error for ${model}-${stage}:`, error);
          // Continue with other analyses even if one fails
        }
      }
    }

    return analyses;
  }
}
