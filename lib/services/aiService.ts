import { AIModel, AnalysisStage, IBrand } from "@/types/brand";
import {
  SentimentAnalysis,
  AIAnalysisResult,
  ParsedAIResponse,
  AIAnalysisResults,
  CompetitorData,
  DomainCitation,
} from "@/types/services";
import { LLMService } from "./llmService";
import { PromptService } from "./promptService";

/**
 * ! AI Service Class - Core Brand Analysis Engine
 *
 * This service orchestrates all AI-powered brand analysis operations across
 * multiple LLM providers (ChatGPT, Claude, Gemini, Perplexity) and marketing funnel stages.
 *
 * @architecture
 * - Uses LLMService for direct AI model communication
 * - Uses PromptService for prompt template management
 * - Implements robust JSON parsing to handle unpredictable LLM responses
 * - Provides stage-specific scoring logic (TOFU, MOFU, BOFU, EVFU)
 *
 * @key_features
 * - Multi-prompt analysis with weighted scoring
 * - Automatic competitor and domain citation extraction
 * - Sentiment analysis and confidence scoring
 * - Graceful error handling with detailed logging
 *
 * @author Your Team
 * @version 2.0.0
 */
export class AIService {
  // ============================================================================
  // * PRIVATE UTILITY METHODS
  // ============================================================================

  /**
   * * Robust JSON extraction from unpredictable LLM responses
   *
   * LLMs often return JSON wrapped in markdown, mixed with text, or with syntax errors.
   * This method implements multiple extraction strategies to handle all common formats.
   *
   * @strategy_1 Remove markdown code fences (```json ... ``` or ``` ... ```)
   * @strategy_2 Extract JSON from mixed text using regex
   * @strategy_3 Fix trailing commas (common LLM mistake)
   * @strategy_4 Remove comments that break JSON parsing
   * @strategy_5 Attempt parsing with standard JSON.parse
   * @strategy_6 Fallback: fix single quotes and retry
   *
   * @param response - Raw string response from LLM
   * @returns Parsed JavaScript object
   * @throws Error with detailed context if all strategies fail
   *
   * @example
   * // Handles all these formats:
   * extractAndParseJSON('```json\n{"score": 85}```')
   * extractAndParseJSON('Here is the analysis: {"score": 85}')
   * extractAndParseJSON("{'score': 85,}") // Single quotes + trailing comma
   */
  private static extractAndParseJSON(response: string): any {
    // ? Validate input
    if (!response || typeof response !== "string") {
      throw new Error("Invalid response: empty or non-string");
    }

    let cleaned = response.trim();

    // * Strategy 1: Remove markdown code fences
    // Matches: ```json\n{...}\n``` or ```{...}```
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");

    // * Strategy 2: Extract JSON object/array from mixed text
    // Looks for outermost { } or [ ] in the string
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      cleaned = jsonMatch[1];
    }

    // * Strategy 3: Remove trailing commas before closing braces/brackets
    // Fixes: {"key": "value",} → {"key": "value"}
    cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

    // * Strategy 4: Remove comments (JSON doesn't allow these)
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, ""); // Block comments
    cleaned = cleaned.replace(/\/\/.*/g, ""); // Line comments

    // * Strategy 5: Standard JSON parsing attempt
    try {
      const parsed = JSON.parse(cleaned);

      // ? Validate the parsed result is an object
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Parsed result is not an object");
      }

      return parsed;
    } catch (parseError) {
      // * Strategy 6: Last resort - fix single quotes and retry
      try {
        // LLMs sometimes use single quotes instead of double quotes
        const singleQuoteFix = cleaned.replace(/'/g, '"');
        return JSON.parse(singleQuoteFix);
      } catch {
        // ! All strategies failed - provide detailed error context
        throw new Error(
          `JSON parsing failed after multiple strategies.\n` +
            `Error: ${
              parseError instanceof Error ? parseError.message : "Unknown"
            }\n` +
            `Response preview (first 300 chars): ${response.substring(
              0,
              300
            )}...`
        );
      }
    }
  }

  /**
   * * Validates that parsed JSON contains all required fields
   *
   * Ensures the LLM returned a complete response with all necessary data.
   * This prevents downstream errors from missing or invalid fields.
   *
   * @param parsed - The parsed JSON object to validate
   * @throws Error if required fields are missing or invalid
   *
   * @validation_rules
   * - Must have: score, confidence, rationale, sentiment
   * - Score must be a valid number (not NaN or string)
   * - Sentiment must be an object (not null or primitive)
   */
  private static validateParsedResponse(parsed: any): void {
    // ? Check for required fields
    const requiredFields = ["score", "confidence", "rationale", "sentiment"];
    const missingFields = requiredFields.filter((field) => !(field in parsed));

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required fields in AI response: ${missingFields.join(
          ", "
        )}\n` + `Available fields: ${Object.keys(parsed).join(", ")}`
      );
    }

    // ? Validate score is a valid number
    if (typeof parsed.score !== "number" || isNaN(parsed.score)) {
      throw new Error(`Invalid score value: ${parsed.score} (expected number)`);
    }

    // ? Validate sentiment structure
    if (!parsed.sentiment || typeof parsed.sentiment !== "object") {
      throw new Error("Invalid or missing sentiment object");
    }
  }

  // ============================================================================
  // * SCORING SYSTEM MESSAGES - Stage-Specific Instructions
  // ============================================================================

  /**
   * * Generates stage-specific scoring instructions for the AI
   *
   * Each marketing funnel stage requires different evaluation criteria:
   *
   * @TOFU (Top of Funnel - Discovery)
   * - Position-based scoring (where brand appears in rankings)
   * - Focus: Visibility and awareness, not quality assessment
   *
   * @MOFU (Middle of Funnel - Evaluation)
   * - Evidence-based scoring (explicit strengths/weaknesses)
   * - Penalizes speculation and hypothetical language
   *
   * @BOFU (Bottom of Funnel - Decision)
   * - Recommendation-based scoring (clear purchase signals)
   * - Requires explicit recommendation language
   *
   * @EVFU (Experience/Validation - Post-Purchase)
   * - Reputation-based scoring (customer sentiment evidence)
   * - Focuses on trust, advocacy, and satisfaction signals
   *
   * @param stage - Marketing funnel stage
   * @returns Detailed system message with scoring rules
   */
  private static getScoringSystemMessage(stage: AnalysisStage): string {
    switch (stage) {
      case "TOFU":
        // ! TOFU: Position matters, NOT sentiment
        return `
          You are a market perception scoring engine.

          Your task is to score a brand based ONLY on its POSITION and VISIBILITY
          within a market discovery response.

          This is a TOFU (Top of Funnel) question.
          Scoring must be POSITION-BASED, not sentiment-based.

          Evaluate:
          - Whether the brand is mentioned at all
          - How prominently it appears (primary, secondary, peripheral)
          - Whether it is framed as a notable or relevant option

          DO NOT infer quality, trust, or recommendation.
          DO NOT reward sentiment, adjectives, or praise.
          DO NOT assume positivity if the brand is merely listed.

          Scoring rules (0–100, continuous):
          - 0: Brand not mentioned at all
          - 15: Brand mentioned on the fifth position
          - 30: Brand mentioned on the fourth position
          - 50: Brand mentioned on the third position
          - 75: Brand mentioned on the second position
          - 100: Brand mentioned on the first position

          You must be conservative and score from the data only.

          For TOFU:
          - If the brand is not mentioned, the score MUST be 0.
          - If the brand is mentioned, the score MUST be based on the position of the brand in the response.
          - If the brand is mentioned multiple times, the score MUST be the highest score for that brand.
          - If the brand is mentioned in a different position each time, the score MUST be the average of the scores for that brand.
          `.trim();

      case "MOFU":
        // ! MOFU: Evidence required, speculation penalized
        return `
          You are a market perception scoring engine.

          This is a MOFU (Middle of Funnel) evaluation question.

          You MUST score the brand based ONLY on EXPLICIT EVIDENCE present in the response.
          Do NOT infer, assume, or speculate beyond what is directly stated.

          Evidence includes:
          - Specific, concrete attributes tied to the brand
          - Clear strengths or weaknesses explicitly described
          - Direct comparisons supported by facts or examples

          The following are NOT evidence and MUST be penalized:
          - Hypothetical language (e.g. "might", "could", "would")
          - Generic industry expectations
          - Balanced narratives without factual grounding
          - Statements admitting lack of data or uncertainty

          Evaluate:
          - Strengths vs weaknesses
          - Clarity of differentiation
          - Perceived fit for the use case
          - Balance of positive vs negative signals

          DO NOT increase score solely because the brand is mentioned.
          DO NOT treat factual descriptions as positive by default.
          If evaluation is mixed or conditional, score neutrally.

          Scoring scale (0–100, continuous):
          - 0–33: Negative evaluation, limitations, criticism
          - 34–66: Mixed, neutral, factual, or unclear evaluation
          - 67–100: Strong, favorable evaluation and perceived fit

          Most MOFU scores should fall between 20 and 60.
          Reserve scores above 85 only for clearly superior evaluations.

          For MOFU:
          - If evaluation is speculative, generic, or lacks evidence, explain that the brand is being evaluated based on assumptions rather than proof.
          - Improvement guidance must focus on publishing concrete comparisons, feature proof, case studies, or third-party validation.
          `.trim();

      case "BOFU":
        // ! BOFU: Explicit recommendations required
        return `
          You are a market perception scoring engine.

          This is a BOFU (Bottom of Funnel) decision-stage question.

          You MUST score the brand based ONLY on EXPLICIT, EVIDENCE-BASED RECOMMENDATION SIGNALS.
          Do NOT infer intent, trust, or preference unless it is clearly stated.

          Valid evidence includes:
          - Direct recommendation language ("recommend", "best choice", "strong option")
          - Clear preference over alternatives with stated reasons
          - Explicit buying signals (pricing suitability, readiness, fit confirmation)

          The following MUST be penalized:
          - Conditional language ("might be", "could be suitable", "depends on")
          - Balanced or neutral comparisons without a decision
          - Hypothetical scenarios
          - Admissions of uncertainty or lack of data

          DO NOT score based on features alone.
          DO NOT reward neutral mentions.
          If no recommendation is made, the score MUST be ≤66.

          Scoring scale (0–100, continuous):
          - 0–33: Not recommended, discouraged, or inferior choice
          - 34–66: Conditional, weak, or neutral recommendation
          - 67–100: Clear, confident recommendation or preference

          Only score above 85 when the brand is presented as an obvious or best choice.

          For BOFU:
          - If the response does not clearly recommend the brand, explain that the decision signal is weak or conditional.
          - Improvement guidance must focus on clarity, decisiveness, pricing fit, or explicit recommendation signals.
          `.trim();

      case "EVFU":
        // ! EVFU: Customer evidence and reputation signals
        return `
          You are a market perception scoring engine.

          This is an EVFU (Experience / Validation Funnel) question.

          You MUST score the brand based ONLY on EXPLICIT POST-PURCHASE EVIDENCE.
          Do NOT assume customer satisfaction, trust, or advocacy.

          Valid evidence includes:
          - Explicit mentions of customer reviews or feedback
          - Statements about reputation, trust, or repeat usage
          - Advocacy signals (recommendations, loyalty, word-of-mouth)
          - Consistent experience over time

          The following MUST be penalized:
          - Generic claims about quality or service
          - Hypothetical or inferred customer sentiment
          - Statements about what customers "would" or "might" feel
          - Absence of customer or reputation evidence

          DO NOT assume positivity if evidence is absent.
          DO NOT infer customer sentiment unless explicitly stated.

          Scoring scale (0–100, continuous):
          - 0–33: Negative experiences, trust issues, dissatisfaction
          - 34–66: Limited, mixed, or unclear validation
          - 67–100: Strong trust, advocacy, and positive reinforcement

          Scores above 85 require clear evidence of customer confidence or advocacy.

          For EVFU:
          - If customer trust or advocacy is not explicitly mentioned, explain that post-purchase validation is missing.
          - Improvement guidance must focus on surfacing reviews, testimonials, reputation signals, or long-term customer outcomes.
          `.trim();

      default:
        throw new Error("Invalid stage");
    }
  }

  // ============================================================================
  // * AI RESPONSE PARSING - Converts Raw LLM Output to Structured Data
  // ============================================================================

  /**
   * * Parses and structures AI responses with scoring analysis
   *
   * This method takes a raw LLM response and extracts structured data including:
   * - Numerical scores (0-100)
   * - Sentiment analysis
   * - Competitor mentions
   * - Domain citations
   * - Actionable recommendations
   *
   * @workflow
   * 1. Sends raw response + scoring rules to ChatGPT for structured analysis
   * 2. Extracts and validates JSON from the scoring response
   * 3. Returns parsed data with all required fields
   *
   * @param prompt - Original prompt sent to the AI
   * @param data - Raw AI response to be scored
   * @param brandData - Brand context for analysis
   * @param stage - Marketing funnel stage for appropriate scoring rules
   * @returns Structured analysis with scores, sentiment, and recommendations
   * @throws Error if JSON parsing or validation fails
   *
   * @note This method uses ChatGPT as the "scoring engine" regardless of which
   *       model generated the original response. This ensures consistent scoring.
   */
  private static async parseAIResponse(
    prompt: string,
    data: string,
    brandData: IBrand,
    stage?: string
  ): Promise<
    ParsedAIResponse & {
      competitorData?: {
        competitors: CompetitorData[];
        domains: DomainCitation[];
      };
    }
  > {
    // * Get stage-specific scoring rules
    const scoringSystemMessage = this.getScoringSystemMessage(
      stage as AnalysisStage
    );

    // * Build the scoring prompt with context
    const scoringPrompt = `
        Brand: "${brandData.name}"
        Funnel Stage: "${stage}"
        Question:
        "${prompt}"

        LLM Response:
        """
        ${data}
        """

        CRITICAL: You MUST return ONLY valid JSON. No markdown, no code fences, no explanations.

        Return a JSON object with these EXACT keys:
        {
          "score": <number between 0-100>,
          "confidence": <number between 0-100>,
          "rationale": "<string explaining the score with actionable recommendations>",
          "sentiment": {
            "overall": "<positive|neutral|negative>",
            "confidence": <number between 0-100>,
            "distribution": {
              "positive": <number>,
              "neutral": <number>,
              "negative": <number>,
              "strongly_positive": <number>
            }
          },
          "competitors_mentioned": [
            {
              "name": "<string>",
              "normalized_name": "<string>",
              "confidence_score": <number>,
              "source_domains": ["<string>"]
            }
          ],
          "domain_citations": [
            {
              "domain": "<string>",
              "authority_score": <number>,
              "source_type": "news|review|industry|academic|social|other",
              "relevance": "high|medium|low",
              "reasoning": "<string>"
            }
          ]
        }

        The "rationale" field MUST:
        1. Explain WHY the score is what it is using only evidence from the response
        2. State what is MISSING if score is below 60
        3. State what was DONE WELL if score is 60 or above
        4. Provide concrete, actionable recommendations for marketers

        Do NOT include any text before or after the JSON object.
        `.trim();

    try {
      // * Call ChatGPT to score and structure the response
      const scoringResult = await LLMService.callChatGPT(
        scoringPrompt,
        scoringSystemMessage
      );

      // * Extract JSON using robust parsing strategies
      const scoringJson = this.extractAndParseJSON(scoringResult.response);

      // * Validate the parsed response has all required fields
      this.validateParsedResponse(scoringJson);

      // * Build the structured response object
      const baseResponse = {
        score: scoringJson.score,
        position_weighted_score: scoringJson.score,
        mentionPosition: null,
        analysis: scoringJson.rationale,
        sentiment: scoringJson.sentiment,
        status: "success" as const,
        competitorData: {
          competitors: scoringJson.competitors_mentioned || [],
          domains: scoringJson.domain_citations || [],
        },
      };

      return baseResponse;
    } catch (error) {
      // ! Parsing failed - log and throw error for proper handling upstream
      console.error("parseAIResponse error:", error);

      throw new Error(
        `Failed to parse AI response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // ============================================================================
  // * STAGE-SPECIFIC SYSTEM MESSAGES - Controls LLM Response Format
  // ============================================================================

  /**
   * * Generates stage-specific instructions for initial LLM queries
   *
   * These messages control HOW the AI responds (format, style, constraints),
   * not how we SCORE the response (that's in getScoringSystemMessage).
   *
   * @key_principle
   * All stages emphasize factual, evidence-based responses without speculation.
   * LLMs should clearly state when information is unavailable rather than fabricate.
   *
   * @param stage - Marketing funnel stage
   * @returns System message that controls AI response behavior
   */
  private static getStageSpecificSystemMessage(stage?: string): string {
    const baseInstructions = `You are a business research assistant answering market questions.
        IMPORTANT:
        - Base your response ONLY on information that can be reasonably inferred or is commonly known.
        - If you do not have specific information about a brand, explicitly state that the information is not available.
        - Clearly distinguish between factual statements and general industry observations.
        - Do NOT invent customer sentiment, performance claims, or recommendations.
        - It is acceptable and preferred to state when evidence is limited or unavailable.
        - Do NOT write marketing copy or persuasive language.
        Avoid using hedge words like 'likely', 'probably', 'seems', 'appears' - be direct and confident in your assessments.`;

    switch (stage) {
      case "TOFU":
        // ! TOFU: Ranked list format for discovery questions
        return `${baseInstructions}
            When answering, respond in the form of a ranked list of exactly 5 options.
            Rank them in order of relevance or visibility in the market.

            Rules:
            - List companies or providers only if they are plausibly active in the described market.
            - Do NOT imply market leadership or dominance unless it is widely recognized.
            - Do NOT add descriptive praise or evaluation.
            - If information is uncertain, include the company lower in the list.

            Do not explain the ranking unless explicitly instructed.`;

      case "MOFU":
        // ! MOFU: Analytical narrative, evidence-focused
        return `${baseInstructions}
            When answering comparison or perception questions:
            
            Rules:
            - Describe how brands are evaluated ONLY if explicitly stated or clearly supported.
            - Do NOT assume strengths, weaknesses, or differentiation without evidence.
            - If evaluation is based on general industry patterns rather than brand-specific proof, state this clearly.
            - Avoid speculative or hypothetical language presented as fact.
            - Provide a cautious, factual analysis rather than a persuasive narrative.
            
            Do NOT format the response as a ranked list unless explicitly requested.`;

      case "BOFU":
        // ! BOFU: Direct recommendation or honest "insufficient data"
        return `${baseInstructions}
            When answering recommendation or purchase-intent questions:
            
            Rules:
            - Recommend the brand ONLY if there is a clear and explicit basis to do so.
            - If there is insufficient information to confidently recommend the brand, state that clearly.
            - Do NOT provide conditional or hypothetical recommendations framed as decisions.
            - It is acceptable to conclude that a recommendation cannot be made due to lack of evidence.
            
            Do NOT format the response as a ranked list unless explicitly requested.`;

      case "EVFU":
        // ! EVFU: Reputation analysis, customer evidence required
        return `${baseInstructions}
            When answering reputation or post-purchase questions:
            
            Rules:
            - Refer to customer sentiment or advocacy ONLY if explicitly supported by evidence.
            - Do NOT generalize customer satisfaction without referencing reviews, testimonials, or reputation signals.
            - If customer feedback or reputation information is not clearly available, state that explicitly.
            - Avoid hypothetical descriptions of loyalty, trust, or advocacy.
            
            Do NOT format the response as a ranked list unless explicitly requested.`;

      default:
        return `${baseInstructions}
            When possible, respond cautiously and avoid speculation.
            State clearly when information is unavailable or uncertain.`;
    }
  }

  // ============================================================================
  // * PUBLIC API METHODS
  // ============================================================================

  /**
   * * Analyzes a brand using a single AI model and prompt
   *
   * This is the core single-analysis method that:
   * 1. Routes to the appropriate AI model (ChatGPT, Claude, Gemini, or Perplexity)
   * 2. Gets raw response from the model
   * 3. Parses and scores the response
   * 4. Returns structured analysis OR detailed error
   *
   * @important Error Handling
   * This method ALWAYS returns exactly ONE result object - never multiple entries.
   * If parsing fails, it returns an error result with score: 0 and status: "error".
   *
   * @param model - Which AI model to use (ChatGPT | Claude | Gemini | Perplexity)
   * @param prompt - The analysis question to ask the AI
   * @param brandData - Brand context (name, industry, etc.)
   * @param stage - Marketing funnel stage for appropriate scoring
   * @returns Single analysis result (success OR error, never both)
   *
   * @example
   * const result = await AIService.analyzeBrand(
   *   "ChatGPT",
   *   "What are the top CRM tools for startups?",
   *   { name: "HubSpot", industry: "SaaS" },
   *   "TOFU"
   * );
   *
   * if (result.status === "success") {
   *   console.log("Score:", result.score);
   * } else {
   *   console.error("Analysis failed:", result.response);
   * }
   */
  public static async analyzeBrand(
    model: AIModel,
    prompt: string,
    brandData: IBrand,
    stage?: string
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now();

    try {
      // * Get stage-specific system message to control AI behavior
      const systemMessage = this.getStageSpecificSystemMessage(stage);

      // * Route to the appropriate AI model
      let aiResponse: { response: string; responseTime: number };

      switch (model) {
        case "ChatGPT":
          aiResponse = await LLMService.callChatGPT(prompt, systemMessage);
          break;
        case "Claude":
          aiResponse = await LLMService.callClaude(prompt, systemMessage);
          break;
        case "Gemini":
          aiResponse = await LLMService.callGemini(prompt, systemMessage);
          break;
        case "Perplexity":
          aiResponse = await LLMService.callPerplexity(prompt, systemMessage);
          break;
        default:
          throw new Error(`Unsupported AI model: ${model}`);
      }

      // * Parse and score the response (this can throw if parsing fails)
      const parsedData = await this.parseAIResponse(
        prompt,
        aiResponse.response,
        brandData,
        stage
      );

      // ? SUCCESS: Return complete analysis result
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
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // ! ERROR: Log and return error result (NO undefined values)
      console.error(`AI Analysis Error for ${model}:`, error);

      return {
        score: 0,
        position_weighted_score: 0,
        response: `Analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        responseTime: responseTime,
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
        analysis: `Analysis failed due to error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        status: "error" as const,
      };
    }
  }

  /**
   * * Performs comprehensive multi-prompt analysis for a brand
   *
   * This is the main analysis orchestrator that:
   * 1. Retrieves all prompts for the specified stage
   * 2. Runs each prompt through the AI model
   * 3. Aggregates results across all prompts
   * 4. Calculates overall scores and sentiment
   * 5. Provides success rate and performance metrics
   *
   * @key_features
   * - Processes multiple prompts sequentially (respects rate limits)
   * - Handles partial failures gracefully (some prompts succeed, others fail)
   * - Aggregates only successful results for accurate scoring
   * - Throws error only if ALL prompts fail
   * - Logs warnings for partial failures
   *
   * @param brandData - Complete brand information
   * @param model - AI model to use for all prompts
   * @param stage - Marketing funnel stage to analyze
   * @returns Aggregated analysis results with detailed metrics
   * @throws Error only if ALL prompts fail (not for partial failures)
   *
   * @example
   * try {
   *   const results = await AIService.analyzeWithMultiplePrompts(
   *     { name: "Slack", industry: "SaaS" },
   *     "ChatGPT",
   *     "MOFU"
   *   );
   *
   *   console.log("Overall Score:", results.overallScore);
   *   console.log("Success Rate:", results.successRate + "%");
   *
   *   if (results.successRate < 100) {
   *     console.warn("Some prompts failed - check individual results");
   *   }
   * } catch (error) {
   *   console.error("Complete failure - all prompts failed:", error);
   * }
   */
  public static async analyzeWithMultiplePrompts(
    brandData: IBrand,
    model: AIModel,
    stage: AnalysisStage
  ): Promise<AIAnalysisResults> {
    try {
      // * Retrieve all prompts configured for this stage
      const stagePrompts = await PromptService.getPromptsByStage(stage);

      if (stagePrompts.length === 0) {
        throw new Error(`No prompts found for stage: ${stage}`);
      }

      // * Initialize aggregation variables
      const promptResults = [];
      let totalResponseTime = 0;
      let successfulPrompts = 0;
      let totalWeightedScore = 0;
      let totalWeightSum = 0;

      const sentimentScores = {
        positive: 0,
        neutral: 0,
        negative: 0,
        strongly_positive: 0,
      };

      // * Process each prompt sequentially
      for (const prompt of stagePrompts) {
        // ? Replace brand-specific placeholders in the prompt template
        const processedPromptText = PromptService.replacePromptPlaceholders(
          prompt.prompt_text,
          brandData
        );

        // ? Analyze with the current model (returns ONE result - success OR error)
        const analysisResult = await this.analyzeBrand(
          model,
          processedPromptText,
          brandData,
          stage
        );

        // * Store the result (single push - no duplicates!)
        promptResults.push({
          promptId: prompt.prompt_id,
          promptText: processedPromptText,
          score: analysisResult.score,
          weightedScore: analysisResult.position_weighted_score,
          mentionPosition: analysisResult.mentionPosition,
          response:
            analysisResult.status === "success"
              ? `Response: \n\n ${analysisResult.response} \n\n Recommendation: ${analysisResult.analysis}`
              : analysisResult.response,
          responseTime: analysisResult.responseTime,
          sentiment: analysisResult.sentiment,
          status: analysisResult.status,
          competitorData: analysisResult.competitorData,
        });

        // * Aggregate metrics ONLY for successful analyses
        if (analysisResult.status === "success") {
          successfulPrompts++;
          totalWeightedScore += analysisResult.position_weighted_score;
          totalWeightSum += 1;

          // ? Accumulate sentiment distribution data
          Object.keys(sentimentScores).forEach((key) => {
            sentimentScores[key as keyof typeof sentimentScores] +=
              analysisResult.sentiment.distribution[
                key as keyof typeof analysisResult.sentiment.distribution
              ];
          });
        }

        totalResponseTime += analysisResult.responseTime;

        // * Rate limiting: delay between API calls
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // =========================================================================
      // * CALCULATE FINAL METRICS
      // =========================================================================

      // ? Overall score: average of all successful prompt scores
      // Returns null if no prompts succeeded (prevents misleading 0)
      const overallScore =
        successfulPrompts > 0
          ? promptResults
              .filter((r) => r.status === "success")
              .reduce((sum, result) => sum + result.score, 0) /
            successfulPrompts
          : null;

      // ? Weighted score: incorporates position-based weighting
      const weightedScore =
        totalWeightSum > 0 ? totalWeightedScore / totalWeightSum : null;

      // ? Success rate: percentage of prompts that completed successfully
      const successRate = (successfulPrompts / stagePrompts.length) * 100;

      // =========================================================================
      // ! ERROR HANDLING: Check for complete or partial failures
      // =========================================================================

      // ! If ALL prompts failed, throw an error (don't return misleading data)
      if (successfulPrompts === 0) {
        throw new Error(
          `All ${stagePrompts.length} prompts failed for ${model}-${stage}. ` +
            `Check promptResults for individual error details.`
        );
      }

      // ! If SOME prompts failed, log a warning (but continue with results)
      if (successfulPrompts < stagePrompts.length) {
        console.warn(
          `Partial failure: ${stagePrompts.length - successfulPrompts} of ${
            stagePrompts.length
          } prompts failed for ${model}-${stage}`
        );
      }

      // =========================================================================
      // * AGGREGATE SENTIMENT ANALYSIS
      // =========================================================================

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

      if (totalSentimentResponses > 0) {
        // ? Calculate total sentiment points across all successful prompts
        const total = Object.values(sentimentScores).reduce(
          (sum, val) => sum + val,
          0
        );

        // ? Convert to percentages
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

        // ? Determine overall sentiment (positive, neutral, or negative)
        if (sentimentScores.positive > sentimentScores.negative) {
          aggregatedSentiment.overall = "positive";
        } else if (sentimentScores.negative > sentimentScores.positive) {
          aggregatedSentiment.overall = "negative";
        }

        // ? Calculate confidence in the sentiment assessment
        aggregatedSentiment.confidence = Math.round(
          (Math.max(...Object.values(sentimentScores)) /
            totalSentimentResponses) *
            100
        );
      }

      // * Return comprehensive analysis results
      return {
        overallScore: overallScore || 0, // Convert null to 0 for backwards compatibility
        weightedScore: weightedScore || 0,
        promptResults,
        aggregatedSentiment,
        totalResponseTime,
        successRate,
      };
    } catch (error) {
      // ! Fatal error: log and re-throw for upstream handling
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
