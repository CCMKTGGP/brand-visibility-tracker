import { AIModel, AnalysisStage } from "@/types/brand";
import { PromptService, ProcessedPrompt } from "./promptService";

// Simplified AI service focused on accurate matrix generation
export class AIService {
  // AI API configuration
  private static readonly API_KEYS = {
    ChatGPT: process.env.OPENAI_API_KEY,
    Claude: process.env.CLAUDE_API_KEY,
    Gemini: process.env.GEMINI_API_KEY,
  };

  private static readonly AI_ENDPOINTS = {
    ChatGPT: process.env.OPENAI_API_URL!,
    Claude: process.env.CLAUDE_API_URL!,
    Gemini: process.env.GEMINI_API_URL!,
  };

  /**
   * Create a structured prompt that ensures AI provides all required metrics
   */
  private static createStructuredPrompt(basePrompt: string): string {
    return `${basePrompt}

IMPORTANT: Please provide your analysis in this EXACT format:

SCORE: [Provide a numerical score from 0-100 for brand performance/visibility]
SENTIMENT: [Must be exactly one of: positive, neutral, negative]
CONFIDENCE: [Your confidence level in this analysis from 0-100]
MENTION_POSITION: [If the brand is mentioned, what position/rank? Use 1-5, or 0 if not mentioned]
POSITIVE_PERCENTAGE: [Percentage of positive sentiment, 0-100]
NEUTRAL_PERCENTAGE: [Percentage of neutral sentiment, 0-100]
NEGATIVE_PERCENTAGE: [Percentage of negative sentiment, 0-100]
STRONGLY_POSITIVE_PERCENTAGE: [Percentage of strongly positive sentiment, 0-100]

ANALYSIS:
[Your detailed analysis here]

Please ensure all numerical values are clearly specified and percentages add up to 100.`;
  }

  /**
   * Parse AI response to extract structured data
   */
  private static parseAIResponse(response: string): {
    score: number;
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
    mentionPosition: number;
    analysis: string;
  } {
    try {
      const parsed = JSON.parse(response);

      return {
        score: Math.min(Math.max(parsed.score ?? 0, 0), 100),
        sentiment: {
          overall:
            (parsed.sentiment?.toLowerCase() as
              | "positive"
              | "neutral"
              | "negative") || "neutral",
          confidence: Math.min(Math.max(parsed.confidence ?? 50, 0), 100),
          distribution: {
            positive: parsed.positivePercentage ?? 0,
            neutral: parsed.neutralPercentage ?? 0,
            negative: parsed.negativePercentage ?? 0,
            strongly_positive: parsed.stronglyPositivePercentage ?? 0,
          },
        },
        mentionPosition: Math.min(Math.max(parsed.mentionPosition ?? 0, 0), 5),
        analysis: parsed.analysis ?? "No analysis provided",
      };
    } catch (err) {
      // Extract score
      const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
      const score = scoreMatch
        ? Math.min(Math.max(parseInt(scoreMatch[1]), 0), 100)
        : 0;

      // Extract sentiment
      const sentimentMatch = response.match(
        /SENTIMENT:\s*(positive|neutral|negative)/i
      );
      const overall =
        (sentimentMatch?.[1]?.toLowerCase() as
          | "positive"
          | "neutral"
          | "negative") || "neutral";

      // Extract confidence
      const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)/i);
      const confidence = confidenceMatch
        ? Math.min(Math.max(parseInt(confidenceMatch[1]), 0), 100)
        : 50;

      // Extract mention position
      const positionMatch = response.match(/MENTION_POSITION:\s*(\d+)/i);
      const mentionPosition = positionMatch
        ? Math.min(Math.max(parseInt(positionMatch[1]), 0), 5)
        : 0;

      // Extract sentiment percentages
      const positiveMatch = response.match(/POSITIVE_PERCENTAGE:\s*(\d+)/i);
      const neutralMatch = response.match(/NEUTRAL_PERCENTAGE:\s*(\d+)/i);
      const negativeMatch = response.match(/NEGATIVE_PERCENTAGE:\s*(\d+)/i);
      const stronglyPositiveMatch = response.match(
        /STRONGLY_POSITIVE_PERCENTAGE:\s*(\d+)/i
      );

      let positive = positiveMatch ? parseInt(positiveMatch[1]) : 0;
      let neutral = neutralMatch ? parseInt(neutralMatch[1]) : 0;
      let negative = negativeMatch ? parseInt(negativeMatch[1]) : 0;
      let strongly_positive = stronglyPositiveMatch
        ? parseInt(stronglyPositiveMatch[1])
        : 0;

      // Normalize percentages to ensure they add up to 100
      const total = positive + neutral + negative;
      if (total > 0) {
        positive = Math.round((positive / total) * 100);
        neutral = Math.round((neutral / total) * 100);
        negative = Math.round((negative / total) * 100);
        strongly_positive = Math.round((strongly_positive / total) * 100);
      } else {
        // Default distribution based on overall sentiment
        switch (overall) {
          case "positive":
            positive = 0;
            neutral = 0;
            negative = 0;
            strongly_positive = 0;
            break;
          case "negative":
            positive = 0;
            neutral = 0;
            negative = 0;
            strongly_positive = 0;
            break;
          default:
            positive = 0;
            neutral = 0;
            negative = 0;
            strongly_positive = 0;
        }
      }

      // Extract analysis
      const analysisMatch = response.match(/ANALYSIS:\s*([\s\S]*)/i);
      const analysis = analysisMatch?.[1]?.trim() || "No analysis provided";

      return {
        score,
        sentiment: {
          overall,
          confidence,
          distribution: {
            positive,
            neutral,
            negative,
            strongly_positive,
          },
        },
        mentionPosition,
        analysis,
      };
    }
  }

  /**
   * Call ChatGPT API
   */
  private static async callChatGPT(prompt: string): Promise<{
    response: string;
    responseTime: number;
  }> {
    const startTime = Date.now();

    if (!this.API_KEYS.ChatGPT) {
      throw new Error("ChatGPT API key not configured");
    }

    try {
      const response = await fetch(this.AI_ENDPOINTS.ChatGPT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.API_KEYS.ChatGPT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "user", content: this.createStructuredPrompt(prompt) },
          ],
          max_tokens: 800,
          temperature: 0.3, // Lower temperature for more consistent responses
        }),
      });

      if (!response.ok) {
        throw new Error(
          `ChatGPT API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return {
        response: data.choices[0].message.content,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(
        `ChatGPT API error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Call Claude API
   */
  private static async callClaude(prompt: string): Promise<{
    response: string;
    responseTime: number;
  }> {
    const startTime = Date.now();

    if (!this.API_KEYS.Claude) {
      throw new Error("Claude API key not configured");
    }

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
          max_tokens: 800,
          messages: [
            { role: "user", content: this.createStructuredPrompt(prompt) },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Claude API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return {
        response: data.content[0].text,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(
        `Claude API error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Call Gemini API
   */
  private static async callGemini(prompt: string): Promise<{
    response: string;
    responseTime: number;
  }> {
    const startTime = Date.now();

    if (!this.API_KEYS.Gemini) {
      throw new Error("Gemini API key not configured");
    }

    try {
      const response = await fetch(this.AI_ENDPOINTS.Gemini, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.API_KEYS.Gemini,
        },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: this.createStructuredPrompt(prompt) }] },
          ],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                score: {
                  type: "INTEGER",
                  description: "Brand performance score from 0-100",
                },
                sentiment: {
                  type: "STRING",
                  enum: ["positive", "neutral", "negative"],
                  description: "Overall sentiment analysis",
                },
                confidence: {
                  type: "INTEGER",
                  description: "Confidence level in this analysis from 0-100",
                },
                mentionPosition: {
                  type: "INTEGER",
                  description:
                    "If the brand is mentioned, what position/rank? Use 1-5, or 0 if not mentioned",
                },
                positivePercentage: {
                  type: "INTEGER",
                  description: "Percentage of positive sentiment, 0-100",
                },
                negativePercentage: {
                  type: "INTEGER",
                  description: "Percentage of negative sentiment, 0-100",
                },
                stronglyPositivePercentage: {
                  type: "INTEGER",
                  description:
                    "Percentage of strongly positive sentiment, 0-100",
                },
                neutralPercentage: {
                  type: "INTEGER",
                  description: "Percentage of neutral sentiment, 0-100",
                },
                analysis: {
                  type: "STRING",
                  description: "Detailed analysis text",
                },
              },
              required: [
                "score",
                "sentiment",
                "confidence",
                "mentionPosition",
                "positivePercentage",
                "negativePercentage",
                "stronglyPositivePercentage",
                "neutralPercentage",
                "analysis",
              ],
              propertyOrdering: [
                "score",
                "sentiment",
                "confidence",
                "mentionPosition",
                "positivePercentage",
                "negativePercentage",
                "stronglyPositivePercentage",
                "neutralPercentage",
                "analysis",
              ],
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Gemini API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return {
        response: data.candidates[0].content.parts[0].text,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(
        `Gemini API error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Analyze brand with a single AI model and prompt
   */
  public static async analyzeBrand(
    model: AIModel,
    prompt: string
  ): Promise<{
    score: number;
    response: string;
    responseTime: number;
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
    mentionPosition: number;
    analysis: string;
    status: "success" | "error";
  }> {
    try {
      let aiResponse: { response: string; responseTime: number };

      // Call the appropriate AI model
      switch (model) {
        case "ChatGPT":
          aiResponse = await this.callChatGPT(prompt);
          break;
        case "Claude":
          aiResponse = await this.callClaude(prompt);
          break;
        case "Gemini":
          aiResponse = await this.callGemini(prompt);
          break;
        default:
          throw new Error(`Unsupported AI model: ${model}`);
      }

      // Parse the structured response
      const parsedData = this.parseAIResponse(aiResponse.response);

      return {
        score: parsedData.score,
        response: aiResponse.response,
        responseTime: aiResponse.responseTime,
        sentiment: parsedData.sentiment,
        mentionPosition: parsedData.mentionPosition,
        analysis: parsedData.analysis,
        status: "success",
      };
    } catch (error) {
      console.error(`AI Analysis Error for ${model}:`, error);
      return {
        score: 0,
        response: `Analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        responseTime: 0,
        sentiment: {
          overall: "negative",
          confidence: 0,
          distribution: {
            positive: 0,
            neutral: 0,
            negative: 0,
            strongly_positive: 0,
          },
        },
        mentionPosition: 0,
        analysis: "Analysis failed due to API error",
        status: "error",
      };
    }
  }

  /**
   * Calculate weighted score based on brand mention position
   */
  private static calculateWeightedScore(
    score: number,
    mentionPosition: number,
    weights: ProcessedPrompt["weights"]
  ): number {
    let weightMultiplier: number;

    switch (mentionPosition) {
      case 1:
        weightMultiplier = weights.weight_first;
        break;
      case 2:
        weightMultiplier = weights.weight_second;
        break;
      case 3:
        weightMultiplier = weights.weight_third;
        break;
      case 4:
        weightMultiplier = weights.weight_fourth;
        break;
      case 5:
        weightMultiplier = weights.weight_fifth;
        break;
      default:
        weightMultiplier = weights.weight_absent;
        break;
    }

    return score * weightMultiplier;
  }

  /**
   * Multi-prompt analysis for a single model and stage
   */
  public static async analyzeWithMultiplePrompts(
    brandData: any,
    model: AIModel,
    stage: AnalysisStage
  ): Promise<{
    overallScore: number;
    weightedScore: number;
    promptResults: Array<{
      promptId: string;
      promptText: string;
      score: number;
      weightedScore: number;
      mentionPosition: number;
      response: string;
      responseTime: number;
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
      status: "success" | "error";
    }>;
    aggregatedSentiment: {
      overall: "positive" | "neutral" | "negative";
      confidence: number;
      distribution: {
        positive: number;
        neutral: number;
        negative: number;
        strongly_positive: number;
      };
    };
    totalResponseTime: number;
    successRate: number;
  }> {
    try {
      // Get prompts for the specific stage
      const stagePrompts = await PromptService.getPromptsByStage(stage);

      if (stagePrompts.length === 0) {
        throw new Error(`No prompts found for stage: ${stage}`);
      }

      const promptResults = [];
      let totalResponseTime = 0;
      let successfulPrompts = 0;
      let totalWeightedScore = 0;
      let totalWeightSum = 0;

      // Aggregate sentiment data
      const sentimentScores = {
        positive: 0,
        neutral: 0,
        negative: 0,
        strongly_positive: 0,
      };

      for (const prompt of stagePrompts) {
        try {
          // Replace placeholders in prompt
          const processedPromptText = PromptService.replacePromptPlaceholders(
            prompt.prompt_text,
            brandData
          );

          // Analyze with AI model
          const analysisResult = await this.analyzeBrand(
            model,
            processedPromptText
          );

          // Calculate weighted score
          const weightedScore = this.calculateWeightedScore(
            analysisResult.score,
            analysisResult.mentionPosition,
            prompt.weights
          );

          promptResults.push({
            promptId: prompt.prompt_id,
            promptText: processedPromptText,
            score: analysisResult.score,
            weightedScore: weightedScore,
            mentionPosition: analysisResult.mentionPosition,
            response: analysisResult.response,
            responseTime: analysisResult.responseTime,
            sentiment: analysisResult.sentiment,
            status: analysisResult.status,
          });

          if (analysisResult.status === "success") {
            successfulPrompts++;
            const finalWeightedScore =
              weightedScore * prompt.weights.base_weight;
            totalWeightedScore += finalWeightedScore;
            totalWeightSum += prompt.weights.base_weight;

            // Aggregate sentiment data
            Object.keys(sentimentScores).forEach((key) => {
              sentimentScores[key as keyof typeof sentimentScores] +=
                analysisResult.sentiment.distribution[
                  key as keyof typeof analysisResult.sentiment.distribution
                ];
            });
          }

          totalResponseTime += analysisResult.responseTime;

          // Add delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error analyzing prompt ${prompt.prompt_id}:`, error);

          promptResults.push({
            promptId: prompt.prompt_id,
            promptText: PromptService.replacePromptPlaceholders(
              prompt.prompt_text,
              brandData
            ),
            score: 0,
            weightedScore: 0,
            mentionPosition: 0,
            response: `Analysis failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            responseTime: 0,
            sentiment: {
              overall: "negative" as const,
              confidence: 0,
              distribution: {
                positive: 0,
                neutral: 0,
                negative: 0,
                strongly_positive: 0,
              },
            },
            status: "error" as const,
          });
        }
      }

      // Calculate overall metrics
      const overallScore =
        successfulPrompts > 0
          ? promptResults
              .filter((r) => r.status === "success")
              .reduce((sum, result) => sum + result.score, 0) /
            successfulPrompts
          : 0;

      // calculate average weighted score
      const weightedScore =
        totalWeightSum > 0 ? totalWeightedScore / totalWeightSum : 0;

      // calculate success rate
      const successRate = (successfulPrompts / stagePrompts.length) * 100;

      // Calculate aggregated sentiment
      const totalSentimentResponses = successfulPrompts;
      let aggregatedSentiment: {
        overall: "positive" | "neutral" | "negative";
        confidence: number;
        distribution: {
          positive: number;
          neutral: number;
          negative: number;
          strongly_positive: number;
        };
      } = {
        overall: "neutral",
        confidence: 0,
        distribution: {
          positive: 0,
          neutral: 0,
          negative: 0,
          strongly_positive: 0,
        },
      };

      if (totalSentimentResponses > 0) {
        // Calculate normalized percentages
        const total = Object.values(sentimentScores).reduce(
          (sum, val) => sum + val,
          0
        );
        if (total > 0) {
          aggregatedSentiment.distribution = {
            positive: Math.round((sentimentScores.positive / total) * 100),
            neutral: Math.round((sentimentScores.neutral / total) * 100),
            negative: Math.round((sentimentScores.negative / total) * 100),
            strongly_positive: Math.round(
              (sentimentScores.strongly_positive / total) * 100
            ),
          };
        }

        // Determine overall sentiment
        if (sentimentScores.positive > sentimentScores.negative) {
          aggregatedSentiment.overall = "positive";
        } else if (sentimentScores.negative > sentimentScores.positive) {
          aggregatedSentiment.overall = "negative";
        }

        // Calculate confidence
        aggregatedSentiment.confidence = Math.round(
          (Math.max(...Object.values(sentimentScores)) /
            totalSentimentResponses) *
            100
        );
      }

      return {
        overallScore,
        weightedScore,
        promptResults,
        aggregatedSentiment,
        totalResponseTime,
        successRate,
      };
    } catch (error) {
      console.error(
        `Multi-prompt analysis error for ${model}-${stage}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Comprehensive multi-prompt analysis across all models and stages
   */
  public static async comprehensiveMultiPromptAnalysis(
    brandData: any,
    models: AIModel[],
    stages: AnalysisStage[]
  ): Promise<
    Array<{
      model: AIModel;
      stage: AnalysisStage;
      result: Awaited<ReturnType<typeof AIService.analyzeWithMultiplePrompts>>;
    }>
  > {
    const analyses = [];

    for (const model of models) {
      for (const stage of stages) {
        try {
          console.log(`Starting multi-prompt analysis for ${model} - ${stage}`);
          const result = await this.analyzeWithMultiplePrompts(
            brandData,
            model,
            stage
          );
          analyses.push({ model, stage, result });

          // Add delay between model/stage combinations
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(
            `Comprehensive analysis error for ${model}-${stage}:`,
            error
          );
          // Continue with other analyses even if one fails
        }
      }
    }

    return analyses;
  }
}
