import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { Types } from "mongoose";
import Brand from "@/lib/models/brand";
import MultiPromptAnalysis from "@/lib/models/multiPromptAnalysis";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { Membership } from "@/lib/models/membership";
import { z } from "zod";
import { RouteParams, BrandParams } from "@/types/api";

const DashboardQuerySchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  period: z.enum(["all", "7d", "30d", "90d"]).optional().default("all"),
  model: z
    .enum(["all", "ChatGPT", "Claude", "Gemini"])
    .optional()
    .default("all"),
  stage: z
    .enum(["all", "TOFU", "MOFU", "BOFU", "EVFU"])
    .optional()
    .default("all"),
});

// Dashboard overview API
export const GET = async (
  request: Request,
  context: { params: RouteParams<BrandParams> }
) => {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request);
    if (!authResult.isValid) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized access!" }),
        { status: 401 }
      );
    }

    const { brandId } = await context.params;
    const url = new URL(request.url);

    // Validate brandId
    if (!brandId || !Types.ObjectId.isValid(brandId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing brandId!" }),
        { status: 400 }
      );
    }

    // Parse query parameters
    const queryParams = {
      userId: url.searchParams.get("userId"),
      period: url.searchParams.get("period"),
      model: url.searchParams.get("model"),
      stage: url.searchParams.get("stage"),
    };

    const parse = DashboardQuerySchema.safeParse(queryParams);
    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid query parameters!",
          data: `${parse.error.issues[0]?.path} - ${parse.error.issues[0]?.message}`,
        }),
        { status: 400 }
      );
    }

    const { userId, period, model, stage } = parse.data;

    // Establish database connection
    await connect();

    // Check if brand exists and user has access
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return new NextResponse(JSON.stringify({ message: "Brand not found!" }), {
        status: 404,
      });
    }

    // Check user permissions (owner or member)
    const membership = await Membership.findOne({
      brand_id: brandId,
      user_id: userId,
      status: "active",
    });

    const isOwner = brand.ownerId.toString() === userId;
    if (!isOwner && !membership) {
      return new NextResponse(
        JSON.stringify({ message: "Access denied to this brand!" }),
        { status: 403 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "all":
      default:
        // For "all", don't set a start date filter - fetch all data
        startDate.setTime(0); // Set to epoch to include all data
        break;
    }

    // Build analysis filter
    const analysisFilter: any = {
      brand_id: new Types.ObjectId(brandId),
    };

    // Only add date filter if not fetching all data
    if (period !== "all") {
      analysisFilter.createdAt = { $gte: startDate, $lte: endDate };
    }

    if (model !== "all") {
      analysisFilter.model = model;
    }
    if (stage !== "all") {
      analysisFilter.stage = stage;
    }

    // Single optimized aggregation pipeline to calculate all dashboard metrics
    const dashboardAggregation = await MultiPromptAnalysis.aggregate([
      // Stage 1: Match current period data with filters
      {
        $match: analysisFilter,
      },

      // Stage 2: Use $facet to calculate multiple metrics in parallel
      {
        $facet: {
          // Current period metrics
          currentMetrics: [
            {
              $group: {
                _id: null,
                totalAnalyses: { $sum: 1 },
                avgOverallScore: { $avg: "$overall_score" },
                avgWeightedScore: { $avg: "$weighted_score" },
                avgResponseTime: { $avg: "$total_response_time" },
                avgSuccessRate: { $avg: "$success_rate" },
                totalPrompts: { $sum: "$metadata.total_prompts" },
                lastUpdated: { $max: "$createdAt" },
              },
            },
          ],

          // Scores by stage
          stageScores: [
            {
              $group: {
                _id: "$stage",
                avgScore: { $avg: "$weighted_score" },
                count: { $sum: 1 },
              },
            },
          ],

          // Model performance
          modelPerformance: [
            {
              $group: {
                _id: "$model",
                avgScore: { $avg: "$weighted_score" },
                totalPrompts: { $sum: 1 },
              },
            },
          ],

          // Sentiment analysis
          sentimentData: [
            {
              $group: {
                _id: null,
                avgPositive: {
                  $avg: "$aggregated_sentiment.distribution.positive",
                },
                avgNeutral: {
                  $avg: "$aggregated_sentiment.distribution.neutral",
                },
                avgNegative: {
                  $avg: "$aggregated_sentiment.distribution.negative",
                },
                avgStronglyPositive: {
                  $avg: "$aggregated_sentiment.distribution.strongly_positive",
                },
              },
            },
          ],

          // Weekly trend data (last 7 days)
          weeklyTrend: [
            {
              $addFields: {
                dayOfWeek: { $dayOfWeek: "$createdAt" },
                dateOnly: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
              },
            },
            {
              $group: {
                _id: "$dateOnly",
                avgScore: { $avg: "$weighted_score" },
                count: { $sum: 1 },
                date: { $first: "$createdAt" },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: 7 },
          ],

          // Heatmap matrix data (stage vs model combinations)
          heatmapMatrix: [
            {
              $group: {
                _id: {
                  stage: "$stage",
                  model: "$model",
                },
                avgOverallScore: { $avg: "$overall_score" },
                avgWeightedScore: { $avg: "$weighted_score" },
                avgSuccessRate: { $avg: "$success_rate" },
                analyses: { $sum: 1 },
              },
            },
            {
              $addFields: {
                performance_level: {
                  $switch: {
                    branches: [
                      {
                        case: { $gte: ["$avgWeightedScore", 80] },
                        then: "excellent",
                      },
                      {
                        case: { $gte: ["$avgWeightedScore", 60] },
                        then: "good",
                      },
                      {
                        case: { $gte: ["$avgWeightedScore", 40] },
                        then: "fair",
                      },
                    ],
                    default: "poor",
                  },
                },
              },
            },
          ],
        },
      },
    ]);

    // Extract results from aggregation
    const currentData = dashboardAggregation[0];

    // Process current metrics - handle case where aggregation returns no data
    const currentMetrics = currentData?.currentMetrics?.[0] || {
      totalAnalyses: 0,
      avgOverallScore: 0,
      avgWeightedScore: 0,
      avgResponseTime: 0,
      avgSuccessRate: 0,
      totalPrompts: 0,
      lastUpdated: new Date(),
    };

    // Process stage scores
    const scores = { TOFU: 0, MOFU: 0, BOFU: 0, EVFU: 0 };
    (currentData?.stageScores || []).forEach((stage: any) => {
      if (stage._id in scores) {
        scores[stage._id as keyof typeof scores] = Math.round(
          stage.avgScore || 0
        );
      }
    });

    // Process model performance
    const modelPerformance = {
      ChatGPT: { score: 0, prompts: 0 },
      Claude: { score: 0, prompts: 0 },
      Gemini: { score: 0, prompts: 0 },
    };
    (currentData?.modelPerformance || []).forEach((model: any) => {
      if (model._id in modelPerformance) {
        modelPerformance[model._id as keyof typeof modelPerformance] = {
          score: Math.round(model.avgScore || 0),
          prompts: model.totalPrompts || 0,
        };
      }
    });

    // Process sentiment data
    const sentimentResult = currentData?.sentimentData?.[0] || {
      avgPositive: 0,
      avgNeutral: 0,
      avgNegative: 0,
      avgStronglyPositive: 0,
    };

    // Process weekly trend data
    const weeklyData = {
      labels: [] as string[],
      scores: [] as number[],
      prompts: [] as number[],
    };

    // Fill in last 7 days (handle missing days)
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });

      const dayData = (currentData?.weeklyTrend || []).find(
        (item: any) => item._id === dateStr
      );

      weeklyData.labels.push(dayLabel);
      weeklyData.scores.push(dayData ? Math.round(dayData.avgScore || 0) : 0);
      weeklyData.prompts.push(dayData ? dayData.count || 0 : 0);
    }

    // Process heatmap data with trend calculation
    const stages = ["TOFU", "MOFU", "BOFU", "EVFU"];
    const models = ["ChatGPT", "Claude", "Gemini"];

    const heatmapData = {
      stages,
      models,
      matrix: [] as Array<{
        stage: string;
        model: string;
        score: number;
        weightedScore: number;
        analyses: number;
        performance_level: "excellent" | "good" | "fair" | "poor";
        confidence: number;
      }>,
      summary: {
        best_combination: { stage: "", model: "", score: 0 },
        worst_combination: { stage: "", model: "", score: 100 },
        avg_score_by_stage: {} as Record<string, number>,
        avg_score_by_model: {} as Record<string, number>,
      },
    };

    // Create heatmap lookup map
    const heatmapMap = new Map();
    (currentData?.heatmapMatrix || []).forEach((item: any) => {
      const key = `${item._id.stage}-${item._id.model}`;
      heatmapMap.set(key, item);
    });

    // Build matrix data for all stage-model combinations
    for (const stage of stages) {
      for (const model of models) {
        const key = `${stage}-${model}`;
        const currentItem = heatmapMap.get(key);

        if (!currentItem) {
          heatmapData.matrix.push({
            stage,
            model,
            score: 0,
            weightedScore: 0,
            analyses: 0,
            performance_level: "poor",
            confidence: 0,
          });
          continue;
        }

        const matrixItem = {
          stage,
          model,
          score: Math.round(currentItem.avgOverallScore * 100) / 100,
          weightedScore: Math.round(currentItem.avgWeightedScore * 100) / 100,
          analyses: currentItem.analyses,
          performance_level: currentItem.performance_level,
          confidence: Math.round(currentItem.avgSuccessRate * 100) / 100,
        };

        heatmapData.matrix.push(matrixItem);

        // Track best and worst combinations
        if (
          currentItem.avgWeightedScore >
          heatmapData.summary.best_combination.score
        ) {
          heatmapData.summary.best_combination = {
            stage,
            model,
            score: Math.round(currentItem.avgWeightedScore * 100) / 100,
          };
        }
        if (
          currentItem.avgWeightedScore <
          heatmapData.summary.worst_combination.score
        ) {
          heatmapData.summary.worst_combination = {
            stage,
            model,
            score: Math.round(currentItem.avgWeightedScore * 100) / 100,
          };
        }
      }
    }

    // Calculate average scores by stage and model
    for (const stage of stages) {
      const stageData = heatmapData.matrix.filter(
        (item) => item.stage === stage
      );
      const avgStageScore =
        stageData.length > 0
          ? stageData.reduce((sum, item) => sum + item.weightedScore, 0) /
            stageData.length
          : 0;
      heatmapData.summary.avg_score_by_stage[stage] =
        Math.round(avgStageScore * 100) / 100;
    }

    for (const model of models) {
      const modelData = heatmapData.matrix.filter(
        (item) => item.model === model
      );
      const avgModelScore =
        modelData.length > 0
          ? modelData.reduce((sum, item) => sum + item.weightedScore, 0) /
            modelData.length
          : 0;
      heatmapData.summary.avg_score_by_model[model] =
        Math.round(avgModelScore * 100) / 100;
    }

    // Build final response with processed data
    const response = {
      brand: {
        id: brand._id,
        name: brand.name,
        category: brand.category,
        region: brand.region,
        target_audience: brand.target_audience,
        competitors: brand.competitors,
        use_case: brand.use_case,
        feature_list: brand.feature_list,
      },
      currentPeriodMetrics: {
        totalAnalyses: currentMetrics.totalAnalyses,
        totalPrompts: currentMetrics.totalPrompts,
        avgOverallScore: Math.round(currentMetrics.avgOverallScore * 100) / 100,
        avgWeightedScore:
          Math.round(currentMetrics.avgWeightedScore * 100) / 100,
        avgResponseTime: Math.round(currentMetrics.avgResponseTime * 100) / 100,
        successRate: Math.round(currentMetrics.avgSuccessRate * 100) / 100,
        lastUpdated:
          currentMetrics.lastUpdated?.toISOString() || new Date().toISOString(),
      },
      scores,
      sentiment: {
        distribution: {
          positive: Math.round(sentimentResult.avgPositive),
          neutral: Math.round(sentimentResult.avgNeutral),
          negative: Math.round(sentimentResult.avgNegative),
          stronglyPositive: Math.round(sentimentResult.avgStronglyPositive),
        },
      },
      modelPerformance,
      weeklyData,
      heatmapData,
      filters: {
        period,
        model,
        stage,
        availablePeriods: ["all", "7d", "30d", "90d"],
        availableModels: ["all", "ChatGPT", "Claude", "Gemini"],
        availableStages: ["all", "TOFU", "MOFU", "BOFU", "EVFU"],
      },
    };

    return new NextResponse(
      JSON.stringify({
        message: "Dashboard data fetched successfully!",
        data: response,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Dashboard API Error:", err);
    return new NextResponse(
      JSON.stringify({
        message: "Error fetching dashboard data",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};
