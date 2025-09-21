import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { Types, connection } from "mongoose";
import Brand from "@/lib/models/brand";
import MultiPromptAnalysis from "@/lib/models/multiPromptAnalysis";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { Membership } from "@/lib/models/membership";
import { z } from "zod";
import { RouteParams, BrandParams } from "@/types/api";

const MatrixQuerySchema = z.object({
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
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("50"),
});

// Matrix analysis API
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
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
    };

    const parse = MatrixQuerySchema.safeParse(queryParams);
    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid query parameters!",
          data: `${parse.error.issues[0]?.path} - ${parse.error.issues[0]?.message}`,
        }),
        { status: 400 }
      );
    }

    const { userId, period, model, stage, page, limit } = parse.data;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

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
      brand_id: new Types.ObjectId(brandId),
      createdAt: { $gte: startDate, $lte: endDate },
      status: "success",
    };

    if (model !== "all") {
      analysisFilter.model = model;
    }
    if (stage !== "all") {
      analysisFilter.stage = stage;
    }

    // Get aggregated matrix data by model and stage combinations using multi-prompt analysis
    const matrixAggregation = [
      {
        $match: analysisFilter,
      },
      {
        $group: {
          _id: {
            model: "$model",
            stage: "$stage",
          },
          avgOverallScore: { $avg: "$overall_score" },
          avgWeightedScore: { $avg: "$weighted_score" }, // Primary metric
          totalAnalyses: { $sum: 1 },
          totalPrompts: { $sum: "$metadata.total_prompts" },
          avgResponseTime: { $avg: "$total_response_time" },
          avgSuccessRate: { $avg: "$success_rate" },
          weightedScores: { $push: "$weighted_score" },
          overallScores: { $push: "$overall_score" },
          latestCreatedAt: { $max: "$createdAt" },
        },
      },
      {
        $sort: {
          "_id.model": 1,
          "_id.stage": 1,
        },
      },
    ];

    // Check if any MultiPromptAnalysis data exists for this brand
    const totalMultiPromptAnalysisCount =
      await MultiPromptAnalysis.countDocuments({
        brand_id: new Types.ObjectId(brandId),
      });

    const [matrixResults, totalCount] = await Promise.all([
      MultiPromptAnalysis.aggregate(matrixAggregation as any[]).exec(),
      MultiPromptAnalysis.countDocuments(analysisFilter),
    ]);

    // If no MultiPromptAnalysis data found, return empty response
    if (matrixResults.length === 0) {
      const response = {
        data: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          hasMore: false,
        },
        summary: {
          totalAnalyses: 0,
          totalPrompts: 0,
          avgWeightedScore: 0,
          bestPerforming: null,
          worstPerforming: null,
        },
        filters: {
          period,
          model,
          stage,
          availablePeriods: ["7d", "30d", "90d"],
          availableModels: ["all", "ChatGPT", "Claude", "Gemini"],
          availableStages: ["all", "TOFU", "MOFU", "BOFU", "EVFU"],
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        },
      };

      return new NextResponse(
        JSON.stringify({
          message:
            "No multi-prompt analysis data found for the specified criteria",
          data: response,
        }),
        { status: 200 }
      );
    }

    // Calculate trend for each matrix cell (compare with previous period)
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(endDate);
    const periodDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    previousStartDate.setDate(previousStartDate.getDate() - periodDays);
    previousEndDate.setDate(previousEndDate.getDate() - periodDays);

    const previousFilter = {
      ...analysisFilter,
      createdAt: { $gte: previousStartDate, $lte: previousEndDate },
    };

    const previousMatrixAggregation = [
      {
        $match: previousFilter,
      },
      {
        $group: {
          _id: {
            model: "$model",
            stage: "$stage",
          },
          avgWeightedScore: { $avg: "$weighted_score" },
        },
      },
    ];

    const previousResults = await MultiPromptAnalysis.aggregate(
      previousMatrixAggregation
    );
    const previousScoreMap = new Map();
    previousResults.forEach((result) => {
      const key = `${result._id.model}-${result._id.stage}`;
      previousScoreMap.set(key, result.avgWeightedScore);
    });

    // Build matrix data with trend calculation using weighted scores
    const matrixData = matrixResults.map((result) => {
      const key = `${result._id.model}-${result._id.stage}`;
      const currentWeightedScore = result.avgWeightedScore || 0;
      const previousWeightedScore =
        previousScoreMap.get(key) || currentWeightedScore;

      let trend: "up" | "down" | "neutral" = "neutral";
      let trendPercentage = 0;

      if (previousWeightedScore > 0) {
        const difference = currentWeightedScore - previousWeightedScore;
        trendPercentage = Math.abs((difference / previousWeightedScore) * 100);

        if (difference > 0.5) trend = "up";
        else if (difference < -0.5) trend = "down";
      }

      return {
        model: result._id.model,
        stage: result._id.stage,
        score: Math.round(result.avgOverallScore || 0),
        weightedScore: Math.round(currentWeightedScore), // Add weighted score
        analyses: result.totalAnalyses || 0, // Number of multi-prompt analyses
        prompts: result.totalPrompts || 0, // Total prompts across all analyses
        avgResponseTime: Math.round((result.avgResponseTime || 0) * 100) / 100,
        successRate: Math.round(result.avgSuccessRate || 0),
        trend,
        trendPercentage: Math.round(trendPercentage),
      };
    });

    // Calculate summary statistics using weighted scores
    const totalAnalyses = matrixData.reduce(
      (sum, item) => sum + item.analyses,
      0
    );
    const totalPrompts = matrixData.reduce(
      (sum, item) => sum + item.prompts,
      0
    );
    const overallAvgWeightedScore =
      totalAnalyses > 0
        ? matrixData.reduce(
            (sum, item) => sum + item.weightedScore * item.analyses,
            0
          ) / totalAnalyses
        : 0;

    // Find best and worst performing combinations based on weighted score
    const sortedByWeightedScore = [...matrixData].sort(
      (a, b) => b.weightedScore - a.weightedScore
    );
    const bestPerforming = sortedByWeightedScore[0]
      ? {
          model: sortedByWeightedScore[0].model,
          stage: sortedByWeightedScore[0].stage,
          score: sortedByWeightedScore[0].weightedScore,
        }
      : null;
    const worstPerforming = sortedByWeightedScore[
      sortedByWeightedScore.length - 1
    ]
      ? {
          model: sortedByWeightedScore[sortedByWeightedScore.length - 1].model,
          stage: sortedByWeightedScore[sortedByWeightedScore.length - 1].stage,
          score:
            sortedByWeightedScore[sortedByWeightedScore.length - 1]
              .weightedScore,
        }
      : null;

    // Get available filter options
    const [availableModels, availableStages] = await Promise.all([
      MultiPromptAnalysis.distinct("model", {
        brand_id: new Types.ObjectId(brandId),
      }),
      MultiPromptAnalysis.distinct("stage", {
        brand_id: new Types.ObjectId(brandId),
      }),
    ]);

    const response = {
      data: matrixData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: matrixData.length,
        hasMore: false, // Matrix view doesn't need pagination typically
      },
      summary: {
        totalAnalyses,
        totalPrompts,
        avgWeightedScore: Math.round(overallAvgWeightedScore * 100) / 100,
        bestPerforming,
        worstPerforming,
      },
      filters: {
        period,
        model,
        stage,
        availablePeriods: ["7d", "30d", "90d"],
        availableModels: ["all", ...availableModels],
        availableStages: ["all", ...availableStages],
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    };

    return new NextResponse(
      JSON.stringify({
        message: "Matrix data fetched successfully!",
        data: response,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Matrix API Error:", err);
    return new NextResponse(
      JSON.stringify({
        message: "Error fetching matrix data",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};
