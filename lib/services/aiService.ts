import { AIModel, AnalysisStage, IBrand } from "@/types/brand";
import {
  SentimentAnalysis,
  StageSpecificWeights,
  AIAnalysisResult,
  ParsedAIResponse,
  StageAnalysisPrompt,
  AIAnalysisResults,
  CompetitorData,
  DomainCitation,
} from "@/types/services";
import { LLMService } from "./llmService";
import { PromptService } from "./promptService";

/**
 * AI Service Class
 *
 * Handles all AI-related operations including:
 * - Brand analysis using multiple AI models (ChatGPT, Claude, Gemini)
 * - Stage-specific analysis (TOFU, MOFU, BOFU, EVFU)
 * - Multi-prompt analysis with weighted scoring
 * - Sentiment analysis and response parsing
 *
 * This service acts as the main orchestrator for AI analysis workflows,
 * coordinating between different AI models and processing their responses
 * into structured, actionable insights.
 */
export class AIService {
  /**
   * Computes stage-specific scores based on AI response values and predefined weights
   *
   * Each funnel stage has different scoring criteria:
   * - TOFU: Position-based scoring (first, second, third, etc.)
   * - MOFU: Tone-based scoring (positive, conditional, neutral, etc.)
   * - BOFU: Intent-based scoring (yes, partial, unclear, etc.)
   * - EVFU: Sentiment-based scoring (recommend, caveat, neutral, etc.)
   *
   * @param stage - The marketing funnel stage being analyzed
   * @param value - The AI response value to score
   * @param weights - Stage-specific weight configuration
   * @param baseWeight - Base weight multiplier for the score
   * @returns Object containing raw score and weighted score
   */
  private static computeStageSpecificScore(
    stage: AnalysisStage,
    value: string,
    weights: StageSpecificWeights,
    baseWeight: number
  ): { rawScore: number; weightedScore: number } {
    let stageMap: Record<string, number> = {};

    // Map the appropriate weight scale based on the funnel stage

    switch (stage) {
      case "TOFU":
        stageMap = weights.position_weights || {};
        break;
      case "MOFU":
        stageMap = weights.mofu_scale || {};
        break;
      case "BOFU":
        stageMap = weights.bofu_scale || {};
        break;
      case "EVFU":
        stageMap = weights.evfu_scale || {};
        break;
    }

    const rawScore = stageMap[value] ?? 0;
    const weightedScore = rawScore * baseWeight;
    return { rawScore, weightedScore };
  }

  /**
   * Generates stage-specific analysis prompts for AI evaluation
   *
   * Creates tailored prompts that instruct the AI to analyze responses
   * according to the specific criteria of each marketing funnel stage.
   * Each stage has unique evaluation parameters and expected response formats.
   *
   * @param prompt - The original question/prompt that was asked
   * @param response - The AI model's response to be analyzed
   * @param stage - The marketing funnel stage (TOFU, MOFU, BOFU, EVFU)
   * @param brandData - Brand information for context
   * @returns Structured prompt configuration with system message and user prompt
   */
  private static getStageSpeficAnalysisPrompt(
    prompt: string,
    response: string,
    stage: AnalysisStage,
    brandData: IBrand
  ): StageAnalysisPrompt {
    const {
      name,
      category,
      region,
      target_audience,
      use_case,
      competitors,
      feature_list,
    } = brandData;

    // Generate comprehensive brand context for AI analysis
    const brandSummary = `
        Brand Context:
        - Brand Name: ${name || "Unknown Brand"}
        - Category: ${category || "General Business Services"}
        - Region: ${region || "Global"}
        - Target Audience: ${
          (target_audience && target_audience.join(", ")) || "Businesses"
        }
        - Use Case: ${use_case || "General Needs"}
        - Competitors: ${
          (competitors && competitors.join(", ")) || "None specified"
        }
        - Key Features: ${
          (feature_list && feature_list.slice(0, 3).join(", ")) ||
          "Core Offerings"
        }`;

    switch (stage) {
      case "TOFU":
        return {
          systemMessage: `You are an analytical model tasked with evaluating a Large Language Model's response to a Top-of-Funnel (TOFU) market visibility question. 
          Your job is to extract structured insights about brand visibility from the given text. Avoid using hedge words like 'likely', 'probably', 'seems', 'appears' - be direct and confident in your assessments.`,
          prompt: `
          Brand Context:
          ${brandSummary}

          Question asked:
          ${prompt}

          Response to Evaluate:
          ${response}

          Follow these steps:
          1. Identify if the brand "${name}" is mentioned or implied in the response.  
          2. Extract a ranked list of all brands or companies mentioned.  
          3. Determine the target brand's relative rank or visibility.  
          4. If the brand is not mentioned, mark it as "absent."
          5. Extract all competitor companies mentioned with their context.
          6. Identify likely source domains where this information comes from.
          7. Add any short contextual comment about competitors or reasons for absence.

          Format strictly like this without the markdown formatting, Make sure all keys and strings are properly quoted and commas are placed correctly.
          Example:
          { 
            "brand_mentioned": true/false,
            "rank": "first|second|third|fourth|fifth|absent",
            "comment": "short comment based on the question asked and the response to evaluate, if the brand is mentioned, provide a short comment on why it is mentioned in the given rank, if the brand is not mentioned, provide a short comment on why it is not mentioned and how it can be improved to be mentioned in the given rank",
            "competitors_mentioned": [
              {
                "name": "Company Name",
                "normalized_name": "company-name",
                "confidence_score": 95,
                "source_domains": ["domain1.com", "domain2.com"]
              }
            ],
            "domain_citations": [
              {
                "domain": "example.com",
                "authority_score": 85,
                "source_type": "news|review|industry|academic|social|other",
                "relevance": "high|medium|low",
                "reasoning": "why this domain would have this info"
              }
            ],
            "sentiment_distribution": {
              "overall": "positive|neutral|negative",
              "confidence": number <0-100>,
              "distribution": {
                "positive": number <0-100>,
                "neutral": number <0-100>,
                "negative": number <0-100>,
                "strongly_positive": number <0-100>,
              }
            }
          }`.trim(),
        };
      case "MOFU":
        return {
          systemMessage: `You are an analytical model tasked with evaluating a Large Language Model's response to a Middle-of-Funnel (MOFU) market visibility question.
          Your job is to extract structured insights about brand positioning, sentiment, and competitive context from the given text. Avoid using hedge words like 'likely', 'probably', 'seems', 'appears' - be direct and confident in your assessments.`,
          prompt: `
          Brand Context:
          ${brandSummary}

          Question asked:
          ${prompt}

          Response to Evaluate:
          ${response}

          Follow these steps:
          1. Identify whether the target brand ("${name}") is mentioned in the response.
          2. Determine how it is positioned (positively, negatively, or neutrally).
          3. Extract any specific strengths, weaknesses, or differentiators attributed to the brand.
          4. If the response compares ${name} to competitors (like ${competitors?.join(
            ", "
          )}), note the comparison and who is favored.
          5. Extract all competitor brands mentioned.
          6. Summarize the overall sentiment tone toward ${name} in one word: "positive", "neutral", or "negative".

          Format strictly like this without the markdown formatting, Make sure all keys and strings are properly quoted and commas are placed correctly.
          Example:
          {
            "tone": "positive|conditional|neutral|negative|absent",
            "comment": "short summary of how ${name} is portrayed or compared, if positive, provide a short comment on why it is positive, if conditional / neutral / negative/ absent, provide a short comment on why it is conditional / neutral / negative / absent and how it can be improved to be positive",
            "sentiment_distribution": {
              "overall": "positive|neutral|negative",
              "confidence": number <0-100>,
              "distribution": {
                "positive": number <0-100>,
                "neutral": number <0-100>,
                "negative": number <0-100>,
                "strongly_positive": number <0-100>,
              }
            }
          }`.trim(),
        };
      case "BOFU":
        return {
          systemMessage: `You are an analytical model tasked with evaluating a Large Language Model's response to a Bottom-of-Funnel (BOFU) market visibility question. 
          Your job is to determine how "${name}" is portrayed in terms of purchase readiness, trustworthiness, and conversion potential. Avoid using hedge words like 'likely', 'probably', 'seems', 'appears' - be direct and confident in your assessments.`,
          prompt: `
          Brand Context:
          ${brandSummary}

          Question asked:
          ${prompt}

          Response to Evaluate:
          ${response}

          Follow these steps:
          1. Check if the target brand ("${name}") is mentioned in the response.
          2. Determine if the response encourages, discourages, or is neutral about buying or signing up with the brand.
          3. Identify any mention of pricing, free trials, consultations, or offers.
          4. Assess how reliable or trustworthy the brand is portrayed.
          5. Extract the overall tone or sentiment toward purchasing intent.

          Format strictly like this without the markdown formatting, Make sure all keys and strings are properly quoted and commas are placed correctly.
          Example:
          {
            "intent": "yes|partial|unclear|no|absent",
            "comment": "short summary of how the response portrays ${name} in terms of readiness to buy or recommend, if yes, provide a short comment on why it is yes, if partial / unclear / no / absent, provide a short comment on why it is partial / unclear / no / absent and how it can be improved to be yes",
            "sentiment_distribution": {
              "overall": "positive|neutral|negative",
              "confidence": number <0-100>,
              "distribution": {
                "positive": number <0-100>,
                "neutral": number <0-100>,
                "negative": number <0-100>,
                "strongly_positive": number <0-100>,
              }
            }
          }`.trim(),
        };
      case "EVFU":
        return {
          systemMessage: `You are an analytical model tasked with evaluating a Large Language Model's response to an End-of-Funnel (EVFU) market visibility question. 
          Your goal is to extract insights on post-purchase reputation, customer satisfaction, and advocacy sentiment for "${name}". Avoid using hedge words like 'likely', 'probably', 'seems', 'appears' - be direct and confident in your assessments.`,
          prompt: `
          Brand Context:
          ${brandSummary}

          Question asked:
          ${prompt}

          Response to Evaluate:
          ${response}

          Follow these steps:
          1. Check if the target brand ("${name}") is mentioned or referenced in the response.
          2. Determine the overall sentiment of how the brand is perceived after purchase or client engagement.
          3. Identify if the response indicates customer satisfaction, trust, loyalty, or advocacy.
          4. Extract any direct or implied recommendation signals (e.g., “people would recommend,” “clients are happy,” “long-term relationships,” etc.).
          5. Identify any weaknesses, concerns, or mixed feedback mentioned.
          6. Summarize the overall brand reputation perception.

          Format strictly like this without the markdown formatting, Make sure all keys and strings are properly quoted and commas are placed correctly.
          Example:
          {
            "sentiment": "recommend|caveat|neutral|negative|absent",
            "comment": "short summary of overall reputation and advocacy perception, if recommend, provide a short comment on why it is recommend, if caveat / neutral / negative / absent, provide a short comment on why it is caveat / neutral / negative / absent and how it can be improved to be recommend",
            "sentiment_distribution": {
              "overall": "positive|neutral|negative",
              "confidence": number <0-100>,
              "distribution": {
                "positive": number <0-100>,
                "neutral": number <0-100>,
                "negative": number <0-100>,
                "strongly_positive": number <0-100>,
              }
            }
          }`.trim(),
        };

      default:
        throw new Error(`Unknown analysis stage: ${stage}`);
    }
  }

  /**
   * Parses AI responses and extracts structured analysis data
   *
   * This method takes raw AI responses and converts them into structured data
   * with proper scoring, sentiment analysis, and stage-specific classifications.
   * It handles JSON parsing, error recovery, and applies stage-specific scoring logic.
   *
   * @param prompt - The original prompt that generated the response
   * @param data - Raw AI response data to parse
   * @param brandData - Brand context information
   * @param stage - Marketing funnel stage for scoring context
   * @param weights - Stage-specific weight configuration
   * @returns Parsed response with scores, sentiment, and analysis
   */
  private static async parseAIResponse(
    prompt: string,
    data: string,
    brandData: IBrand,
    stage?: string,
    weights?: StageSpecificWeights
  ): Promise<
    ParsedAIResponse & {
      competitorData?: {
        competitors: CompetitorData[];
        domains: DomainCitation[];
      };
    }
  > {
    const aiResponse = await LLMService.callChatGPT(
      this.getStageSpeficAnalysisPrompt(
        prompt,
        data,
        stage as AnalysisStage,
        brandData
      ).prompt,
      this.getStageSpeficAnalysisPrompt(
        prompt,
        data,
        stage as AnalysisStage,
        brandData
      ).systemMessage
    );
    let response;
    try {
      response = JSON.parse(aiResponse.response);
    } catch (error) {
      console.error("JSON parsing error:", error);
      console.error("Raw AI response:", aiResponse.response);
      // Create error response with default values when JSON parsing fails
      response = {
        score: 0,
        position_weighted_score: 0,
        mentionPosition: null,
        analysis: `JSON parsing failed. Raw response: ${aiResponse.response}`,
        sentiment: {
          overall: "neutral" as const,
          confidence: 0,
          distribution: {
            positive: 0,
            neutral: 0,
            negative: 0,
            strongly_positive: 0,
          },
        },
        status: "error" as const,
      };
    }

    if (response.status === "error") {
      return response;
    }

    // Extract stage-specific values and convert to mention positions
    let value = "";
    let mentionedPosition = null;

    // Map AI response values to numerical positions based on stage type
    switch (stage) {
      case "TOFU":
        value = response.rank;
        mentionedPosition =
          response.rank === "first"
            ? 1
            : response.rank === "second"
            ? 2
            : response.rank === "third"
            ? 3
            : response.rank === "fourth"
            ? 4
            : response.rank === "fifth"
            ? 5
            : 0;
        break;
      case "MOFU":
        value = response.tone;
        mentionedPosition =
          response.tone === "positive"
            ? 1
            : response.tone === "conditional"
            ? 2
            : response.tone === "neutral"
            ? 3
            : response.tone === "negative"
            ? 4
            : 0;
        break;
      case "BOFU":
        value = response.intent;
        mentionedPosition =
          response.intent === "yes"
            ? 1
            : response.intent === "partial"
            ? 2
            : response.intent === "unclear"
            ? 3
            : response.intent === "no"
            ? 4
            : 0;
        break;
      case "EVFU":
        value = response.sentiment;
        mentionedPosition =
          response.sentiment === "recommend"
            ? 1
            : response.sentiment === "caveat"
            ? 2
            : response.sentiment === "neutral"
            ? 3
            : response.sentiment === "negative"
            ? 4
            : 0;
        break;
      default:
        throw new Error(`Unknown stage: ${stage}`);
    }

    const { rawScore, weightedScore } = this.computeStageSpecificScore(
      stage as AnalysisStage,
      value,
      weights || { base_weight: 1 },
      weights?.base_weight || 1
    );

    const baseResponse = {
      score: rawScore,
      position_weighted_score: weightedScore,
      mentionPosition: mentionedPosition,
      analysis: response.comment,
      sentiment: response.sentiment_distribution,
      status: "success" as const,
    };

    // Extract competitor data for TOFU stage only
    if (
      stage === "TOFU" &&
      response.competitors_mentioned &&
      response.domain_citations
    ) {
      const competitorData: {
        competitors: CompetitorData[];
        domains: DomainCitation[];
      } = {
        competitors: response.competitors_mentioned.map((comp: any) => ({
          name: comp.name,
          normalized_name: comp.normalized_name,
          confidence_score: comp.confidence_score,
          industry_category: brandData.category || "business",
          source_domains: comp.source_domains.map((domain: string) => ({
            domain,
          })),
        })),
        domains: response.domain_citations.map((domain: any) => ({
          domain: domain.domain,
          authority_score: domain.authority_score,
          source_type: domain.source_type,
          relevance: domain.relevance,
          reasoning: domain.reasoning,
          confidence: 90,
        })),
      };

      return {
        ...baseResponse,
        competitorData,
      };
    }

    return baseResponse;
  }

  /**
   * System message template for AI models
   *
   * This message provides consistent instructions across all AI models,
   * ensuring they understand the context and respond appropriately for
   * different marketing funnel stages.
   */
  private static readonly systemMessage = `You are a helpful assistant tasked with answering business discovery questions using general market knowledge and inference.
  When possible, respond in the form of a ranked list of exactly 5 options.
  Rank them in order of relevance, prominence, or likelihood.
  If you are unfamiliar with any specific brands, provide comparable examples or general best practices.
  Avoid discussing your training data or knowledge cutoff unless specifically asked.
  Do not explain the ranking unless explicitly instructed.
  Avoid using hedge words like 'likely', 'probably', 'seems', 'appears' - be direct and confident in your assessments.`;

  /**
   * Analyzes a brand using a single AI model and prompt
   *
   * This is the core analysis method that:
   * 1. Calls the specified AI model with the given prompt
   * 2. Parses the response using stage-specific logic
   * 3. Calculates weighted scores based on mention position
   * 4. Extracts sentiment analysis data
   * 5. Returns structured analysis results
   *
   * @param model - AI model to use (ChatGPT, Claude, or Gemini)
   * @param prompt - Analysis prompt to send to the AI
   * @param brandData - Brand information for context
   * @param stage - Marketing funnel stage for scoring
   * @param weights - Stage-specific weight configuration
   * @returns Complete analysis result with scores and sentiment
   */
  public static async analyzeBrand(
    model: AIModel,
    prompt: string,
    brandData: IBrand,
    stage?: string,
    weights?: StageSpecificWeights
  ): Promise<AIAnalysisResult> {
    try {
      let aiResponse: { response: string; responseTime: number };

      // Route to the appropriate AI model based on the model parameter
      switch (model) {
        case "ChatGPT":
          aiResponse = await LLMService.callChatGPT(prompt, this.systemMessage);
          break;
        case "Claude":
          aiResponse = await LLMService.callClaude(prompt, this.systemMessage);
          break;
        case "Gemini":
          aiResponse = await LLMService.callGemini(prompt, this.systemMessage);
          break;
        default:
          throw new Error(`Unsupported AI model: ${model}`);
      }

      // Parse the structured response with AI-generated weighted scores
      const parsedData = await this.parseAIResponse(
        prompt,
        aiResponse.response,
        brandData,
        stage,
        weights
      );

      return {
        score: parsedData.score,
        position_weighted_score: parsedData.position_weighted_score,
        response: aiResponse.response,
        responseTime: aiResponse.responseTime,
        sentiment: parsedData.sentiment,
        mentionPosition: parsedData.mentionPosition,
        analysis: parsedData.analysis,
        status: "success",
        competitorData: parsedData.competitorData,
      };
    } catch (error) {
      console.error(`AI Analysis Error for ${model}:`, error);
      // Return error response with default values when analysis fails
      return {
        score: 0,
        position_weighted_score: 0,
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
        mentionPosition: 0,
        analysis: "Analysis failed due to API error",
        status: "error" as const,
      };
    }
  }

  /**
   * Performs comprehensive multi-prompt analysis for a single model and stage
   *
   * This method orchestrates the complete analysis workflow:
   * 1. Retrieves all prompts for the specified stage
   * 2. Processes each prompt with the AI model
   * 3. Aggregates results across all prompts
   * 4. Calculates overall scores and sentiment
   * 5. Computes success rates and performance metrics
   *
   * This is the primary method used for comprehensive brand analysis,
   * providing detailed insights across multiple evaluation criteria.
   *
   * @param brandData - Complete brand information for analysis
   * @param model - AI model to use for analysis
   * @param stage - Marketing funnel stage to analyze
   * @returns Aggregated analysis results with detailed metrics
   */
  public static async analyzeWithMultiplePrompts(
    brandData: IBrand,
    model: AIModel,
    stage: AnalysisStage
  ): Promise<AIAnalysisResults> {
    try {
      // Retrieve all prompts configured for this marketing funnel stage
      const stagePrompts = await PromptService.getPromptsByStage(stage);

      if (stagePrompts.length === 0) {
        throw new Error(`No prompts found for stage: ${stage}`);
      }

      // Initialize tracking variables for aggregation
      const promptResults = [];
      let totalResponseTime = 0;
      let successfulPrompts = 0;
      let totalWeightedScore = 0;
      let totalWeightSum = 0;

      // Initialize sentiment aggregation tracking
      const sentimentScores = {
        positive: 0,
        neutral: 0,
        negative: 0,
        strongly_positive: 0,
      };

      // Process each prompt individually and aggregate results
      for (const prompt of stagePrompts) {
        try {
          // Replace brand-specific placeholders in the prompt template
          const processedPromptText = PromptService.replacePromptPlaceholders(
            prompt.prompt_text,
            brandData
          );

          // Perform AI analysis with the processed prompt
          const analysisResult = await this.analyzeBrand(
            model,
            processedPromptText,
            brandData,
            stage,
            prompt.weights
          );

          promptResults.push({
            promptId: prompt.prompt_id,
            promptText: processedPromptText,
            score: analysisResult.score * 100,
            weightedScore: analysisResult.position_weighted_score * 100,
            mentionPosition: analysisResult.mentionPosition,
            response: `Response: \n\n ${analysisResult.response} \n\n Recommendation: ${analysisResult.analysis}`,
            responseTime: analysisResult.responseTime,
            sentiment: analysisResult.sentiment,
            status: analysisResult.status,
            competitorData: analysisResult.competitorData,
          });

          // Aggregate successful analysis results
          if (analysisResult.status === "success") {
            successfulPrompts++;
            totalWeightedScore += analysisResult.position_weighted_score * 100;
            totalWeightSum += 1;

            // Accumulate sentiment distribution data for overall sentiment calculation
            Object.keys(sentimentScores).forEach((key) => {
              sentimentScores[key as keyof typeof sentimentScores] +=
                analysisResult.sentiment.distribution[
                  key as keyof typeof analysisResult.sentiment.distribution
                ];
            });
          }

          totalResponseTime += analysisResult.responseTime;

          // Add delay between API calls to respect rate limits and avoid overwhelming the AI services
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error analyzing prompt ${prompt.prompt_id}:`, error);

          // Create error result entry for failed prompt analysis
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
            stage_specific_classification: "not_mentioned",
          });
        }
      }

      // Calculate comprehensive performance metrics

      // Overall score: average of all successful prompt scores
      const overallScore =
        successfulPrompts > 0
          ? promptResults
              .filter((r) => r.status === "success")
              .reduce((sum, result) => sum + result.score, 0) /
            successfulPrompts
          : 0;

      // Weighted score: incorporates position-based weighting for more accurate assessment
      const weightedScore =
        totalWeightSum > 0 ? totalWeightedScore / totalWeightSum : 0;

      // Success rate: percentage of prompts that completed successfully
      const successRate = (successfulPrompts / stagePrompts.length) * 100;

      // Calculate aggregated sentiment analysis across all successful prompts
      const totalSentimentResponses = successfulPrompts;
      const aggregatedSentiment: SentimentAnalysis = {
        overall: "neutral",
        confidence: 0,
        distribution: {
          positive: 0,
          neutral: 0,
          negative: 0,
          strongly_positive: 0,
        },
      };

      // Process sentiment data only if we have successful responses
      if (totalSentimentResponses > 0) {
        // Calculate normalized percentages for sentiment distribution
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

        // Determine overall sentiment based on positive vs negative balance
        if (sentimentScores.positive > sentimentScores.negative) {
          aggregatedSentiment.overall = "positive";
        } else if (sentimentScores.negative > sentimentScores.positive) {
          aggregatedSentiment.overall = "negative";
        }

        // Calculate confidence level based on the dominant sentiment
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
      throw new Error(
        `Failed to complete multi-prompt analysis: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
