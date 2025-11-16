import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { Types } from "mongoose";
import Brand from "@/lib/models/brand";
import MultiPromptAnalysis from "@/lib/models/multiPromptAnalysis";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { Membership } from "@/lib/models/membership";
import { z } from "zod";
import { RouteParams, BrandParams } from "@/types/api";

const MatrixQuerySchema = z.object({
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

    // Single optimized aggregation using $facet to get all data in one query
    const matrixAggregation = await MultiPromptAnalysis.aggregate([
      // Stage 1: Match current period data
      {
        $match: analysisFilter,
      },

      // Stage 2: Use $facet to calculate everything in parallel
      {
        $facet: {
          // Paginated matrix data
          paginatedData: [
            {
              $group: {
                _id: {
                  model: "$model",
                  stage: "$stage",
                },
                avgOverallScore: { $avg: "$overall_score" },
                avgWeightedScore: { $avg: "$weighted_score" },
                totalAnalyses: { $sum: 1 },
                totalPrompts: { $sum: "$metadata.total_prompts" },
                avgResponseTime: { $avg: "$total_response_time" },
                avgSuccessRate: { $avg: "$success_rate" },
                latestCreatedAt: { $max: "$createdAt" },
              },
            },
            {
              $sort: {
                "_id.model": 1,
                "_id.stage": 1,
              },
            },
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum },
          ],

          // Total count of unique model-stage combinations
          totalCount: [
            {
              $group: {
                _id: {
                  model: "$model",
                  stage: "$stage",
                },
              },
            },
            { $count: "total" },
          ],

          // All data for best/worst calculation (without pagination)
          allData: [
            {
              $group: {
                _id: {
                  model: "$model",
                  stage: "$stage",
                },
                avgOverallScore: { $avg: "$overall_score" },
                avgWeightedScore: { $avg: "$weighted_score" },
                totalAnalyses: { $sum: 1 },
                totalPrompts: { $sum: "$metadata.total_prompts" },
                avgResponseTime: { $avg: "$total_response_time" },
                avgSuccessRate: { $avg: "$success_rate" },
              },
            },
            {
              $sort: { avgWeightedScore: -1 },
            },
          ],

          // Summary statistics
          summaryStats: [
            {
              $group: {
                _id: null,
                totalAnalyses: { $sum: 1 },
                totalPrompts: { $sum: "$metadata.total_prompts" },
                avgWeightedScore: { $avg: "$weighted_score" },
              },
            },
          ],
        },
      },
    ]);

    // Extract results from aggregation
    const currentData = matrixAggregation[0];
    const paginatedResults = currentData.paginatedData || [];
    const totalCount = currentData.totalCount[0]?.total || 0;
    const allResults = currentData.allData || [];
    const summaryStats = currentData.summaryStats[0] || {
      totalAnalyses: 0,
      totalPrompts: 0,
      avgWeightedScore: 0,
    };

    // If no data found, return empty response
    if (paginatedResults.length === 0) {
      const response = {
        data: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
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
          availablePeriods: ["all", "7d", "30d", "90d"],
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

    // Process paginated matrix data
    const matrixData = paginatedResults.map((result: any) => {
      const currentWeightedScore = result.avgWeightedScore || 0;

      return {
        model: result._id.model,
        stage: result._id.stage,
        score: Math.round(result.avgOverallScore || 0),
        weightedScore: Math.round(currentWeightedScore),
        analyses: result.totalAnalyses || 0,
        prompts: result.totalPrompts || 0,
        avgResponseTime: Math.round((result.avgResponseTime || 0) * 100) / 100,
        successRate: Math.round(result.avgSuccessRate || 0),
      };
    });

    // Find best and worst performing combinations from all data
    const bestPerforming = allResults[0]
      ? {
          model: allResults[0]._id.model,
          stage: allResults[0]._id.stage,
          score: Math.round(allResults[0].avgWeightedScore),
        }
      : null;

    const worstPerforming = allResults[allResults.length - 1]
      ? {
          model: allResults[allResults.length - 1]._id.model,
          stage: allResults[allResults.length - 1]._id.stage,
          score: Math.round(allResults[allResults.length - 1].avgWeightedScore),
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

    // Build final response with optimized data
    const response = {
      data: matrixData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        hasMore: pageNum * limitNum < totalCount,
      },
      summary: {
        totalAnalyses: summaryStats.totalAnalyses,
        totalPrompts: summaryStats.totalPrompts,
        avgWeightedScore: Math.round(summaryStats.avgWeightedScore * 100) / 100,
        bestPerforming,
        worstPerforming,
      },
      filters: {
        period,
        model,
        stage,
        availablePeriods: ["all", "7d", "30d", "90d"],
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
