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
  period: z.enum(["7d", "30d", "90d"]).optional().default("7d"),
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
    }

    // Build analysis filter
    const analysisFilter: any = {
      brand_id: brandId,
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (model !== "all") {
      analysisFilter.model = model;
    }
    if (stage !== "all") {
      analysisFilter.stage = stage;
    }

    // Get current period analytics using multi-prompt analysis
    const analysisData = await MultiPromptAnalysis.find(analysisFilter).sort({
      createdAt: -1,
    });

    // Calculate aggregated metrics using multi-prompt analysis data
    const totalAnalyses = analysisData.length;
    const avgOverallScore =
      totalAnalyses > 0
        ? analysisData.reduce((sum, item) => sum + item.overall_score, 0) /
          totalAnalyses
        : 0;
    const avgWeightedScore =
      totalAnalyses > 0
        ? analysisData.reduce((sum, item) => sum + item.weighted_score, 0) /
          totalAnalyses
        : 0;
    const avgResponseTime =
      totalAnalyses > 0
        ? analysisData.reduce(
            (sum, item) => sum + item.total_response_time,
            0
          ) / totalAnalyses
        : 0;
    const successRate =
      totalAnalyses > 0
        ? analysisData.reduce((sum, item) => sum + item.success_rate, 0) /
          totalAnalyses
        : 0;

    // Calculate total prompts processed across all analyses
    const totalPromptsProcessed = analysisData.reduce(
      (sum, item) => sum + item.metadata.total_prompts,
      0
    );

    // Calculate scores by stage
    const scores = {
      TOFU: 0,
      MOFU: 0,
      BOFU: 0,
      EVFU: 0,
    };

    const stageCounts: Record<keyof typeof scores, number> = {
      TOFU: 0,
      MOFU: 0,
      BOFU: 0,
      EVFU: 0,
    };
    analysisData.forEach(
      (item: { stage: keyof typeof scores; weighted_score: number }) => {
        if (item.stage in scores) {
          scores[item.stage] += item.weighted_score; // Use weighted score
          stageCounts[item.stage]++;
        }
      }
    );

    Object.keys(scores).forEach((stageKey) => {
      const stage = stageKey as keyof typeof scores;
      scores[stage] =
        stageCounts[stage] > 0 ? scores[stage] / stageCounts[stage] : 0;
    });

    // Calculate sentiment analysis
    let sentimentData = {
      positive: 0,
      neutral: 0,
      negative: 0,
      stronglyPositive: 0,
    };
    let sentimentCount = 0;

    analysisData.forEach((item) => {
      sentimentData.positive += item.aggregated_sentiment.distribution.positive;
      sentimentData.neutral += item.aggregated_sentiment.distribution.neutral;
      sentimentData.negative += item.aggregated_sentiment.distribution.negative;
      sentimentData.stronglyPositive +=
        item.aggregated_sentiment.distribution.strongly_positive;
      sentimentCount++;
    });

    if (sentimentCount > 0) {
      sentimentData = {
        positive: sentimentData.positive / sentimentCount,
        neutral: sentimentData.neutral / sentimentCount,
        negative: sentimentData.negative / sentimentCount,
        stronglyPositive: sentimentData.stronglyPositive / sentimentCount,
      };
    }

    // Calculate sentiment trend using weighted scores
    const recentData = analysisData.slice(0, Math.floor(totalAnalyses / 2));
    const olderData = analysisData.slice(Math.floor(totalAnalyses / 2));

    let trend: "up" | "down" | "neutral" = "neutral";
    let trendPercentage = 0;

    if (recentData.length > 0 && olderData.length > 0) {
      const recentAvg =
        recentData.reduce((sum, item) => sum + item.weighted_score, 0) /
        recentData.length;
      const olderAvg =
        olderData.reduce((sum, item) => sum + item.weighted_score, 0) /
        olderData.length;

      const difference = recentAvg - olderAvg;
      trendPercentage = Math.abs((difference / olderAvg) * 100);

      if (difference > 0.5) trend = "up";
      else if (difference < -0.5) trend = "down";
    }

    // Calculate model performance
    const modelPerformance = {
      ChatGPT: { score: 0, prompts: 0 },
      Claude: { score: 0, prompts: 0 },
      Gemini: { score: 0, prompts: 0 },
    };

    analysisData.forEach((item) => {
      const model = item.model as keyof typeof modelPerformance;
      modelPerformance[model].score += item.weighted_score; // Use weighted score
      modelPerformance[model].prompts++;
    });

    // Calculate averages for model performance
    Object.keys(modelPerformance).forEach((modelKey) => {
      const model = modelKey as keyof typeof modelPerformance;
      if (modelPerformance[model].prompts > 0) {
        modelPerformance[model].score =
          modelPerformance[model].score / modelPerformance[model].prompts;
      }
    });

    // Get weekly trend data (last 7 days)
    const weeklyData = {
      labels: [] as string[],
      scores: [] as number[],
      prompts: [] as number[],
    };

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const dayData = analysisData.filter(
        (item) => item.createdAt >= dayStart && item.createdAt <= dayEnd
      );

      const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });
      const dayAvgScore =
        dayData.length > 0
          ? dayData.reduce((sum, item) => sum + item.weighted_score, 0) /
            dayData.length
          : 0;

      weeklyData.labels.push(dayLabel);
      weeklyData.scores.push(Math.round(dayAvgScore));
      weeklyData.prompts.push(dayData.length);
    }

    const response = {
      brand: {
        id: brand._id,
        name: brand.name,
        category: brand.category,
        region: brand.region,
      },
      currentPeriodMetrics: {
        totalAnalyses: totalAnalyses,
        totalPrompts: totalPromptsProcessed,
        avgOverallScore: Math.round(avgOverallScore * 100) / 100,
        avgWeightedScore: Math.round(avgWeightedScore * 100) / 100, // Primary metric
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
        lastUpdated:
          analysisData[0]?.createdAt?.toISOString() || new Date().toISOString(),
      },
      scores: {
        TOFU: Math.round(scores.TOFU),
        MOFU: Math.round(scores.MOFU),
        BOFU: Math.round(scores.BOFU),
        EVFU: Math.round(scores.EVFU),
      },
      sentiment: {
        trend,
        percentage: Math.round(trendPercentage),
        distribution: {
          positive: Math.round(sentimentData.positive),
          neutral: Math.round(sentimentData.neutral),
          negative: Math.round(sentimentData.negative),
          stronglyPositive: Math.round(sentimentData.stronglyPositive),
        },
      },
      modelPerformance: {
        ChatGPT: {
          score: Math.round(modelPerformance.ChatGPT.score),
          prompts: modelPerformance.ChatGPT.prompts,
        },
        Claude: {
          score: Math.round(modelPerformance.Claude.score),
          prompts: modelPerformance.Claude.prompts,
        },
        Gemini: {
          score: Math.round(modelPerformance.Gemini.score),
          prompts: modelPerformance.Gemini.prompts,
        },
      },
      weeklyData,
      filters: {
        period,
        model,
        stage,
        availablePeriods: ["7d", "30d", "90d"],
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
