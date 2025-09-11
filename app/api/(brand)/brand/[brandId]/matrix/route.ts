import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { Types, connection } from "mongoose";
import Brand from "@/lib/models/brand";
import BrandAnalysis from "@/lib/models/brandAnalysis";
import BrandMetrics from "@/lib/models/brandMetrics";
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

    // Get aggregated matrix data by model and stage combinations
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
          avgScore: { $avg: "$score" },
          totalPrompts: { $sum: 1 },
          avgResponseTime: { $avg: "$response_time" },
          avgSuccessRate: { $avg: "$success_rate" },
          scores: { $push: "$score" },
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

    // Check if any BrandAnalysis data exists for this brand
    const totalBrandAnalysisCount = await BrandAnalysis.countDocuments({
      brand_id: new Types.ObjectId(brandId),
    });

    const [matrixResults, totalCount] = await Promise.all([
      BrandAnalysis.aggregate(matrixAggregation as any[]).exec(),
      BrandAnalysis.countDocuments(analysisFilter),
    ]);

    // Fallback: If no BrandAnalysis data found, try to use BrandMetrics data
    if (matrixResults.length === 0 && totalBrandAnalysisCount === 0) {
      // Check for BrandMetrics data
      const metricsFilter: any = {
        brand_id: new Types.ObjectId(brandId),
        date: { $gte: startDate, $lte: endDate },
      };

      const brandMetrics = await BrandMetrics.find(metricsFilter)
        .sort({ date: -1 })
        .limit(10);

      if (brandMetrics.length > 0) {
        // Convert BrandMetrics to Matrix format
        const metricsData = [];
        const latestMetric = brandMetrics[0];

        // Extract data from aggregated_data.model_breakdown
        const models = ["ChatGPT", "Claude", "Gemini"] as const;
        const stages = ["TOFU", "MOFU", "BOFU", "EVFU"] as const;

        for (const modelName of models) {
          for (const stageName of stages) {
            const modelData =
              latestMetric.aggregated_data?.model_breakdown?.[modelName];
            const stageScore =
              latestMetric.aggregated_data?.stageBreakdown?.[stageName] ||
              latestMetric.aggregated_data?.stage_breakdown?.[stageName];

            if (modelData && modelData.prompts > 0) {
              metricsData.push({
                model: modelName,
                stage: stageName,
                score: Math.round(stageScore || modelData.score || 0),
                prompts: modelData.prompts || 0,
                avgResponseTime: modelData.avg_response_time || 0,
                successRate: Math.round(modelData.success_rate || 0),
                trend: "neutral" as const,
                trendPercentage: 0,
              });
            }
          }
        }

        if (metricsData.length > 0) {
          const response = {
            data: metricsData,
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: metricsData.length,
              hasMore: false,
            },
            summary: {
              totalAnalyses: metricsData.reduce(
                (sum, item) => sum + item.prompts,
                0
              ),
              avgScore: Math.round(
                metricsData.reduce((sum, item) => sum + item.score, 0) /
                  metricsData.length
              ),
              bestPerforming: metricsData.sort((a, b) => b.score - a.score)[0]
                ? {
                    model: metricsData.sort((a, b) => b.score - a.score)[0]
                      .model,
                    stage: metricsData.sort((a, b) => b.score - a.score)[0]
                      .stage,
                    score: metricsData.sort((a, b) => b.score - a.score)[0]
                      .score,
                  }
                : null,
              worstPerforming: null,
            },
            filters: {
              period,
              model,
              stage,
              availablePeriods: ["7d", "30d", "90d"],
              availableModels: ["all", ...models],
              availableStages: ["all", ...stages],
              dateRange: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
              },
            },
          };

          return new NextResponse(
            JSON.stringify({
              message: "Matrix data fetched successfully from metrics!",
              data: response,
            }),
            { status: 200 }
          );
        }
      }

      // Last resort: Check brandmetrix collection directly
      try {
        const db = connection.db;
        const brandmetrixCollection = db?.collection("brandmetrix");
        if (brandmetrixCollection) {
          const directMetrics = await brandmetrixCollection
            .find({
              brand_id: new Types.ObjectId(brandId),
            })
            .limit(5)
            .toArray();
          if (directMetrics.length > 0) {
            console.log(
              "Matrix API Debug - Sample brandmetrix document:",
              JSON.stringify(directMetrics[0], null, 2)
            );
          }
        }
      } catch (directQueryError) {
        console.log("Matrix API Debug - Direct query error:", directQueryError);
      }
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
          avgScore: { $avg: "$score" },
        },
      },
    ];

    const previousResults = await BrandAnalysis.aggregate(
      previousMatrixAggregation
    );
    const previousScoreMap = new Map();
    previousResults.forEach((result) => {
      const key = `${result._id.model}-${result._id.stage}`;
      previousScoreMap.set(key, result.avgScore);
    });

    // Build matrix data with trend calculation
    const matrixData = matrixResults.map((result) => {
      const key = `${result._id.model}-${result._id.stage}`;
      const currentScore = result.avgScore;
      const previousScore = previousScoreMap.get(key) || currentScore;

      let trend: "up" | "down" | "neutral" = "neutral";
      let trendPercentage = 0;

      if (previousScore > 0) {
        const difference = currentScore - previousScore;
        trendPercentage = Math.abs((difference / previousScore) * 100);

        if (difference > 0.5) trend = "up";
        else if (difference < -0.5) trend = "down";
      }

      return {
        model: result._id.model,
        stage: result._id.stage,
        score: Math.round(currentScore),
        prompts: result.totalPrompts,
        avgResponseTime: Math.round(result.avgResponseTime * 100) / 100,
        successRate: Math.round(result.avgSuccessRate),
        trend,
        trendPercentage: Math.round(trendPercentage),
      };
    });

    // Calculate summary statistics
    const totalAnalyses = matrixData.reduce(
      (sum, item) => sum + item.prompts,
      0
    );
    const overallAvgScore =
      totalAnalyses > 0
        ? matrixData.reduce((sum, item) => sum + item.score * item.prompts, 0) /
          totalAnalyses
        : 0;

    // Find best and worst performing combinations
    const sortedByScore = [...matrixData].sort((a, b) => b.score - a.score);
    const bestPerforming = sortedByScore[0] || null;
    const worstPerforming = sortedByScore[sortedByScore.length - 1] || null;

    // Get available filter options
    const [availableModels, availableStages] = await Promise.all([
      BrandAnalysis.distinct("model", {
        brand_id: new Types.ObjectId(brandId),
      }),
      BrandAnalysis.distinct("stage", {
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
        avgScore: Math.round(overallAvgScore * 100) / 100,
        bestPerforming: bestPerforming
          ? {
              model: bestPerforming.model,
              stage: bestPerforming.stage,
              score: bestPerforming.score,
            }
          : null,
        worstPerforming: worstPerforming
          ? {
              model: worstPerforming.model,
              stage: worstPerforming.stage,
              score: worstPerforming.score,
            }
          : null,
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
