import { Types } from "mongoose";
import MultiPromptAnalysis from "@/lib/models/multiPromptAnalysis";
import { PromptService } from "./promptService";
import { AnalysisStage, AIModel } from "@/types/brand";
import {
  OrganizedAnalysisData,
  DashboardMetrics,
  AIAnalysisResults,
  PerformanceLevel,
  TriggerType,
  ProcessedPromptResult,
  DashboardFilters,
  DateRange,
  CompetitorData,
} from "@/types/services";

/**
 * Data Organization Service
 *
 * Handles the processing, storage, and organization of AI analysis results:
 * - Processing raw AI responses into structured analysis data
 * - Storing analysis results in the database with proper validation
 * - Generating comprehensive dashboard metrics and insights
 * - Calculating performance trends and comparative analytics
 * - Organizing time-series data for visualization
 *
 * This service acts as the data layer between raw AI responses and
 * the dashboard/reporting systems, ensuring data consistency and
 * providing meaningful analytics for brand performance tracking.
 */
export class DataOrganizationService {
  /**
   * Processes and stores comprehensive AI analysis results
   *
   * Takes raw AI analysis results and transforms them into a structured format
   * suitable for storage and reporting. This includes:
   * - Performance level classification based on scores and positions
   * - Data validation and sanitization
   * - Metadata enrichment with user and system information
   * - Database storage with proper error handling
   *
   * @param brandId - The brand being analyzed
   * @param model - AI model used for analysis
   * @param stage - Marketing funnel stage analyzed
   * @param aiAnalysisResults - Raw results from AI analysis
   * @param userId - User who initiated the analysis
   * @param triggerType - How the analysis was triggered
   * @returns Promise resolving to organized analysis data
   * @throws Error if processing or storage fails
   */
  public static async processAndStoreAnalysis(
    brandId: string,
    model: AIModel,
    stage: AnalysisStage,
    aiAnalysisResults: AIAnalysisResults,
    userId: string,
    triggerType: TriggerType = "manual",
    analysisId?: string // Optional analysis_id to group analyses from the same run
  ): Promise<OrganizedAnalysisData> {
    try {
      // Retrieve prompt configurations to access weight settings
      const stagePrompts = await PromptService.getPromptsByStage(stage);
      const promptMap = new Map(stagePrompts.map((p) => [p.prompt_id, p]));

      // Process each prompt result with enhanced scoring and classification
      const processedPromptResults: ProcessedPromptResult[] = [];
      let performanceLevel: PerformanceLevel;

      for (const promptResult of aiAnalysisResults.promptResults) {
        const prompt = promptMap.get(promptResult.promptId);
        if (!prompt) {
          console.warn(`Prompt not found: ${promptResult.promptId}`);
          continue;
        }

        // Classify performance level based on weighted score and mention position
        if (
          aiAnalysisResults.weightedScore >= 80 &&
          promptResult.mentionPosition === 1
        ) {
          performanceLevel = "excellent";
        } else if (
          aiAnalysisResults.weightedScore >= 60 &&
          promptResult.mentionPosition === 2
        ) {
          performanceLevel = "good";
        } else if (
          aiAnalysisResults.weightedScore >= 40 &&
          promptResult.mentionPosition === 3
        ) {
          performanceLevel = "fair";
        } else {
          performanceLevel = "poor";
        }

        processedPromptResults.push({
          prompt_id: promptResult.promptId,
          prompt_text: promptResult.promptText,
          raw_response: promptResult.response,
          scoring_result: {
            raw_score: promptResult.score,
            position_weighted_score: promptResult.weightedScore,
            mention_position: promptResult.mentionPosition,
            competitorData: promptResult.competitorData,
          },
          performance_level: performanceLevel,
          processing_time: promptResult.responseTime,
          status: promptResult.status,
        });
      }

      // Assemble the complete organized analysis data structure
      const organizedData: OrganizedAnalysisData = {
        analysis_id: analysisId || new Types.ObjectId().toString(), // Use provided analysis_id or generate one
        brand_id: brandId,
        model,
        stage,
        timestamp: new Date(),

        // Core Metrics
        overall_score: aiAnalysisResults.overallScore,
        weighted_score: aiAnalysisResults.weightedScore,

        // Detailed Results
        prompt_results: processedPromptResults,

        // Aggregated Sentiment
        sentiment_analysis: aiAnalysisResults.aggregatedSentiment,

        // Metadata
        metadata: {
          user_id: userId,
          trigger_type: triggerType,
          version: "2.0",
          total_prompts: processedPromptResults.length,
          successful_prompts: processedPromptResults.filter(
            (p) => p.status === "success"
          ).length,
          total_processing_time: aiAnalysisResults.totalResponseTime,
        },
      };

      // Persist the organized data to the database
      await this.storeAnalysisData(organizedData);

      return organizedData;
    } catch (error) {
      console.error("Error processing analysis data:", error);
      throw new Error(
        `Failed to process analysis: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Stores organized analysis data in the database with validation
   *
   * Performs comprehensive data validation and sanitization before storage:
   * - Validates and clamps numeric values to acceptable ranges
   * - Ensures sentiment distributions are properly normalized
   * - Handles edge cases and invalid data gracefully
   * - Creates proper MongoDB document structure
   *
   * @param data - Organized analysis data to store
   * @throws Error if validation fails or database operation fails
   */
  private static async storeAnalysisData(
    data: OrganizedAnalysisData
  ): Promise<void> {
    try {
      // Comprehensive data validation and sanitization to ensure data integrity
      const sanitizedOverallScore = isNaN(data.overall_score)
        ? 0
        : Math.min(Math.max(data.overall_score, 0), 100);
      const sanitizedWeightedScore = isNaN(data.weighted_score)
        ? 0
        : Math.min(Math.max(data.weighted_score, 0), 100);
      const sanitizedConfidence = isNaN(data.sentiment_analysis.confidence)
        ? 0
        : Math.min(Math.max(data.sentiment_analysis.confidence, 0), 100);
      const sanitizedTotalProcessingTime = isNaN(
        data.metadata.total_processing_time
      )
        ? 0
        : Math.max(data.metadata.total_processing_time, 0);

      // Calculate success rate with proper bounds checking
      const successRate =
        data.metadata.total_prompts > 0
          ? Math.min(
              Math.max(
                (data.metadata.successful_prompts /
                  data.metadata.total_prompts) *
                  100,
                0
              ),
              100
            )
          : 0;

      // Validate and normalize sentiment distribution values
      const distribution = {
        positive: isNaN(data.sentiment_analysis.distribution.positive)
          ? 0
          : Math.min(
              Math.max(data.sentiment_analysis.distribution.positive, 0),
              100
            ),
        neutral: isNaN(data.sentiment_analysis.distribution.neutral)
          ? 0
          : Math.min(
              Math.max(data.sentiment_analysis.distribution.neutral, 0),
              100
            ),
        negative: isNaN(data.sentiment_analysis.distribution.negative)
          ? 0
          : Math.min(
              Math.max(data.sentiment_analysis.distribution.negative, 0),
              100
            ),
        strongly_positive: isNaN(
          data.sentiment_analysis.distribution.strongly_positive
        )
          ? 0
          : Math.min(
              Math.max(
                data.sentiment_analysis.distribution.strongly_positive,
                0
              ),
              100
            ),
      };

      const multiPromptAnalysis = new MultiPromptAnalysis({
        brand_id: new Types.ObjectId(data.brand_id),
        analysis_id: data.analysis_id, // Store the analysis_id to group analyses from the same run
        model: data.model,
        stage: data.stage,
        overall_score: sanitizedOverallScore,
        weighted_score: sanitizedWeightedScore,
        total_response_time: sanitizedTotalProcessingTime,
        success_rate: isNaN(successRate) ? 0 : successRate,
        aggregated_sentiment: {
          overall: data.sentiment_analysis.overall,
          confidence: sanitizedConfidence,
          distribution: distribution,
        },
        prompt_results: data.prompt_results.map((result) => ({
          prompt_id: result.prompt_id,
          prompt_text: result.prompt_text,
          score: isNaN(result.scoring_result.raw_score)
            ? 0
            : Math.min(Math.max(result.scoring_result.raw_score, 0), 100),
          weighted_score: isNaN(result.scoring_result.position_weighted_score)
            ? 0
            : Math.min(
                Math.max(result.scoring_result.position_weighted_score, 0),
                100
              ),
          mention_position: result?.scoring_result?.mention_position
            ? isNaN(result?.scoring_result?.mention_position)
              ? 0
              : Math.min(
                  Math.max(result?.scoring_result?.mention_position, 0),
                  5
                )
            : 0,
          response: result.raw_response || "No response",
          response_time: isNaN(result.processing_time)
            ? 0
            : Math.max(result.processing_time, 0),
          sentiment: {
            overall: data.sentiment_analysis.overall,
            confidence: sanitizedConfidence,
            distribution: distribution,
          },
          status: result.status,
          competitors_mentioned:
            data.stage === "TOFU"
              ? result.scoring_result?.competitorData?.competitors?.map(
                  (competitor: CompetitorData) => ({
                    name: competitor.name,
                    normalized_name: competitor.normalized_name,
                    confidence_score: competitor.confidence_score,
                    source_domains:
                      competitor.source_domains?.map((source: any) =>
                        typeof source === "string" ? source : source.domain
                      ) || [],
                  })
                )
              : undefined,
          domain_citations:
            data.stage === "TOFU"
              ? result.scoring_result?.competitorData?.domains
              : undefined,
        })),
        metadata: {
          user_id: new Types.ObjectId(data.metadata.user_id),
          trigger_type: data.metadata.trigger_type,
          version: data.metadata.version,
          total_prompts: Math.max(data.metadata.total_prompts, 0),
          successful_prompts: Math.max(data.metadata.successful_prompts, 0),
        },
        status: data.prompt_results.some((result) => result.status === "error")
          ? "error"
          : "success",
      });

      await multiPromptAnalysis.save();
      console.log(
        `Successfully stored analysis for ${data.model}-${data.stage}`
      );
    } catch (error) {
      console.error("Error storing analysis data:", error);
      console.error(
        "Original data that failed to store:",
        JSON.stringify(data, null, 2)
      );
      throw new Error(
        `Failed to store analysis: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generates comprehensive dashboard metrics for brand performance analysis
   *
   * Creates a complete dashboard dataset including:
   * - Brand summary information and basic metrics
   * - Funnel performance analysis with trend calculations
   * - Model performance comparisons and reliability metrics
   * - Time-series data for visualization charts
   * - AI-generated insights and recommendations
   *
   * @param brandId - Brand to generate metrics for
   * @param dateRange - Time period for analysis
   * @param filters - Optional filters for model/stage specific analysis
   * @returns Promise resolving to comprehensive dashboard metrics
   * @throws Error if no data found or processing fails
   */
  public static async generateDashboardMetrics(
    brandId: string,
    dateRange: DateRange,
    filters?: DashboardFilters
  ): Promise<DashboardMetrics> {
    try {
      // Construct database query with date range and optional filters
      const filter: any = {
        brand_id: new Types.ObjectId(brandId),
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        status: "success",
      };

      if (filters?.model) filter.model = filters.model;
      if (filters?.stage) filter.stage = filters.stage;

      // Retrieve analysis data from database with population
      const analysisData = await MultiPromptAnalysis.find(filter)
        .populate("brand_id", "name")
        .sort({ createdAt: -1 })
        .lean();

      if (analysisData.length === 0) {
        throw new Error("No analysis data found for the specified criteria");
      }

      // Analyze funnel performance across all stages with trend analysis
      const funnelPerformance = await this.calculateFunnelPerformance(
        analysisData,
        dateRange
      );

      // Compare performance across different AI models
      const modelPerformance = this.calculateModelPerformance(analysisData);

      // Create time-series data points for chart visualization
      const timeSeriesData = this.generateTimeSeriesData(
        analysisData,
        dateRange
      );

      // Generate AI-powered insights and recommendations
      const insights = this.generateDashboardInsights(
        analysisData,
        funnelPerformance,
        modelPerformance
      );

      return {
        brand_summary: {
          brand_id: brandId,
          brand_name:
            (analysisData[0] as any).brand_id?.name || "Unknown Brand",
          last_updated: analysisData[0]?.createdAt || new Date(),
          total_analyses: analysisData.length,
        },
        funnel_performance: funnelPerformance,
        model_performance: modelPerformance,
        time_series_data: timeSeriesData,
        insights,
      };
    } catch (error) {
      console.error("Error generating dashboard metrics:", error);
      throw new Error(
        `Failed to generate metrics: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Calculate funnel performance with trends
   */
  private static async calculateFunnelPerformance(
    analysisData: any[],
    dateRange: { start: Date; end: Date }
  ) {
    const stages: AnalysisStage[] = ["TOFU", "MOFU", "BOFU", "EVFU"];
    const funnelPerformance: any = {};

    // Calculate previous period for trend analysis
    const periodDuration = dateRange.end.getTime() - dateRange.start.getTime();
    const previousStart = new Date(dateRange.start.getTime() - periodDuration);
    const previousEnd = new Date(dateRange.end.getTime() - periodDuration);

    for (const stage of stages) {
      const currentData = analysisData.filter((d) => d.stage === stage);
      const currentScore =
        currentData.length > 0
          ? currentData.reduce((sum, d) => sum + d.weighted_score, 0) /
            currentData.length
          : 0;

      // Get previous period data for trend
      const previousData = await MultiPromptAnalysis.find({
        brand_id: analysisData[0]?.brand_id,
        stage,
        createdAt: { $gte: previousStart, $lte: previousEnd },
        status: "success",
      }).lean();

      const previousScore =
        previousData.length > 0
          ? previousData.reduce((sum, d) => sum + d.weighted_score, 0) /
            previousData.length
          : currentScore;

      const change =
        previousScore > 0
          ? ((currentScore - previousScore) / previousScore) * 100
          : 0;
      const trend: "up" | "down" | "neutral" =
        change > 5 ? "up" : change < -5 ? "down" : "neutral";

      funnelPerformance[stage] = {
        score: Math.round(currentScore * 100) / 100,
        trend,
        change: Math.round(Math.abs(change) * 100) / 100,
      };
    }

    return funnelPerformance;
  }

  /**
   * Calculate model performance metrics
   */
  private static calculateModelPerformance(analysisData: any[]) {
    const models: AIModel[] = ["ChatGPT", "Claude", "Gemini"];
    const modelPerformance: any = {};

    for (const model of models) {
      const modelData = analysisData.filter((d) => d.model === model);

      if (modelData.length === 0) {
        modelPerformance[model] = { score: 0, analyses: 0, reliability: 0 };
        continue;
      }

      const avgScore =
        modelData.reduce((sum, d) => sum + d.weighted_score, 0) /
        modelData.length;
      const reliability =
        modelData.reduce((sum, d) => sum + d.success_rate, 0) /
        modelData.length;

      modelPerformance[model] = {
        score: Math.round(avgScore * 100) / 100,
        analyses: modelData.length,
        reliability: Math.round(reliability * 100) / 100,
      };
    }

    return modelPerformance;
  }

  /**
   * Generate time series data for charts
   */
  private static generateTimeSeriesData(
    analysisData: any[],
    dateRange: { start: Date; end: Date }
  ) {
    const timeSeriesData = [];
    const dayMs = 24 * 60 * 60 * 1000;

    for (
      let date = new Date(dateRange.start);
      date <= dateRange.end;
      date.setTime(date.getTime() + dayMs)
    ) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayData = analysisData.filter(
        (d) => d.createdAt >= dayStart && d.createdAt <= dayEnd
      );

      const overallScore =
        dayData.length > 0
          ? dayData.reduce((sum, d) => sum + d.overall_score, 0) /
            dayData.length
          : 0;

      const weightedScore =
        dayData.length > 0
          ? dayData.reduce((sum, d) => sum + d.weighted_score, 0) /
            dayData.length
          : 0;

      // Calculate mention rate
      const totalPrompts = dayData.reduce(
        (sum, d) => sum + d.metadata.total_prompts,
        0
      );
      const mentionedPrompts = dayData.reduce(
        (sum, d) =>
          sum +
          d.prompt_results.filter((p: any) => p.mention_position > 0).length,
        0
      );
      const mentionRate =
        totalPrompts > 0 ? (mentionedPrompts / totalPrompts) * 100 : 0;

      timeSeriesData.push({
        date: date.toISOString().split("T")[0],
        overall_score: Math.round(overallScore * 100) / 100,
        weighted_score: Math.round(weightedScore * 100) / 100,
        mention_rate: Math.round(mentionRate * 100) / 100,
        analyses_count: dayData.length,
      });
    }

    return timeSeriesData;
  }

  /**
   * Generate dashboard insights
   */
  private static generateDashboardInsights(
    analysisData: any[],
    funnelPerformance: any,
    modelPerformance: any
  ) {
    // Find top performing stage
    const topPerformingStage = Object.entries(funnelPerformance).reduce(
      (a, b) => ((a[1] as any).score > (b[1] as any).score ? a : b)
    )[0] as AnalysisStage;

    // Find best model
    const bestModel = Object.entries(modelPerformance).reduce((a, b) =>
      (a[1] as any).score > (b[1] as any).score ? a : b
    )[0] as AIModel;

    // Determine performance trend
    const trends = Object.values(funnelPerformance).map(
      (stage: any) => stage.trend
    );
    const upTrends = trends.filter((t) => t === "up").length;
    const downTrends = trends.filter((t) => t === "down").length;

    let performanceTrend: "improving" | "declining" | "stable";
    if (upTrends > downTrends) performanceTrend = "improving";
    else if (downTrends > upTrends) performanceTrend = "declining";
    else performanceTrend = "stable";

    // Generate key recommendations
    const keyRecommendations = [];

    // Check for low-performing stages
    Object.entries(funnelPerformance).forEach(
      ([stage, data]: [string, any]) => {
        if (data.score < 50) {
          keyRecommendations.push(
            `Improve ${stage} performance (currently ${data.score})`
          );
        }
      }
    );

    // Check for declining trends
    Object.entries(funnelPerformance).forEach(
      ([stage, data]: [string, any]) => {
        if (data.trend === "down") {
          keyRecommendations.push(
            `Address declining ${stage} trend (-${data.change}%)`
          );
        }
      }
    );

    // Model-specific recommendations
    const lowestPerformingModel = Object.entries(modelPerformance).reduce(
      (a, b) => ((a[1] as any).score < (b[1] as any).score ? a : b)
    );

    if ((lowestPerformingModel[1] as any).score < 40) {
      keyRecommendations.push(
        `Investigate ${lowestPerformingModel[0]} model performance issues`
      );
    }

    return {
      top_performing_stage: topPerformingStage,
      best_model: bestModel,
      key_recommendations: keyRecommendations.slice(0, 5), // Limit to top 5
      performance_trend: performanceTrend,
    };
  }
}
