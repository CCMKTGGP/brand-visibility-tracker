import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { Types } from "mongoose";
import Brand from "@/lib/models/brand";
import MultiPromptAnalysis from "@/lib/models/multiPromptAnalysis";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { Membership } from "@/lib/models/membership";
import { IBrand } from "@/types/brand";
import { z } from "zod";

const MatrixSummaryQuerySchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  period: z.enum(["all", "7d", "30d", "90d"]).optional().default("all"),
});

export interface BrandMatrixSummary {
  brandId: string;
  brandName: string;
  totalAnalyses: number;
  avgWeightedScore: number;
  avgOverallScore: number;
  bestPerforming: {
    model: string;
    stage: string;
    score: number;
  } | null;
  worstPerforming: {
    model: string;
    stage: string;
    score: number;
  } | null;
  totalPrompts: number;
  avgResponseTime: number;
  successRate: number;
  lastAnalysisDate: Date | null;
  hasData: boolean;
}

// Matrix summary API for brand list
export const GET = async (request: Request) => {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request);
    if (!authResult.isValid) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized access!" }),
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const queryParams = {
      userId: url.searchParams.get("userId"),
      period: url.searchParams.get("period"),
    };

    const parse = MatrixSummaryQuerySchema.safeParse(queryParams);
    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid query parameters!",
          data: `${parse.error.issues[0]?.path} - ${parse.error.issues[0]?.message}`,
        }),
        { status: 400 }
      );
    }

    const { userId, period } = parse.data;

    // Establish database connection
    await connect();

    // Get all brands the user has access to
    const userBrands = await Brand.find({ ownerId: userId });
    const memberBrands = await Membership.find({
      user_id: userId,
      status: "active",
    }).populate("brand_id");

    const allBrands = [
      ...userBrands,
      ...memberBrands
        .filter((membership) => membership.brand_id)
        .map((membership) => membership.brand_id as IBrand),
    ];

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

    const brandSummaries: BrandMatrixSummary[] = [];

    // Process each brand
    for (const brand of allBrands) {
      const brandId = brand._id.toString();

      // Get analysis data for this brand
      const analysisFilter: any = {
        brand_id: new Types.ObjectId(brandId),
      };

      // Only add date filter if not fetching all data
      if (period !== "all") {
        analysisFilter.createdAt = { $gte: startDate, $lte: endDate };
      }

      const [analysisData, matrixResults] = await Promise.all([
        MultiPromptAnalysis.find(analysisFilter).sort({ createdAt: -1 }),
        MultiPromptAnalysis.aggregate([
          { $match: analysisFilter },
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
        ]),
      ]);

      if (analysisData.length === 0) {
        // No data for this brand
        brandSummaries.push({
          brandId,
          brandName: brand.name,
          totalAnalyses: 0,
          avgWeightedScore: 0,
          avgOverallScore: 0,
          bestPerforming: null,
          worstPerforming: null,
          totalPrompts: 0,
          avgResponseTime: 0,
          successRate: 0,
          lastAnalysisDate: null,
          hasData: false,
        });
        continue;
      }

      // Calculate summary statistics
      const totalAnalyses = analysisData.length;
      const avgOverallScore =
        analysisData.reduce((sum, item) => sum + item.overall_score, 0) /
        totalAnalyses;
      const avgWeightedScore =
        analysisData.reduce((sum, item) => sum + item.weighted_score, 0) /
        totalAnalyses;
      const totalPrompts = analysisData.reduce(
        (sum, item) => sum + item.metadata.total_prompts,
        0
      );
      const avgResponseTime =
        analysisData.reduce((sum, item) => sum + item.total_response_time, 0) /
        totalAnalyses;
      const successRate =
        analysisData.reduce((sum, item) => sum + item.success_rate, 0) /
        totalAnalyses;

      // Find best and worst performing combinations
      const sortedByWeightedScore = matrixResults.sort(
        (a, b) => b.avgWeightedScore - a.avgWeightedScore
      );

      const bestPerforming = sortedByWeightedScore[0]
        ? {
            model: sortedByWeightedScore[0]._id.model,
            stage: sortedByWeightedScore[0]._id.stage,
            score: Math.round(sortedByWeightedScore[0].avgWeightedScore),
          }
        : null;

      const worstPerforming = sortedByWeightedScore[
        sortedByWeightedScore.length - 1
      ]
        ? {
            model:
              sortedByWeightedScore[sortedByWeightedScore.length - 1]._id.model,
            stage:
              sortedByWeightedScore[sortedByWeightedScore.length - 1]._id.stage,
            score: Math.round(
              sortedByWeightedScore[sortedByWeightedScore.length - 1]
                .avgWeightedScore
            ),
          }
        : null;

      brandSummaries.push({
        brandId,
        brandName: brand.name,
        totalAnalyses,
        avgWeightedScore: Math.round(avgWeightedScore * 100) / 100,
        avgOverallScore: Math.round(avgOverallScore * 100) / 100,
        bestPerforming,
        worstPerforming,
        totalPrompts,
        avgResponseTime: Math.round(avgResponseTime),
        successRate: Math.round(successRate),
        lastAnalysisDate: analysisData[0]?.createdAt || null,
        hasData: true,
      });
    }

    return new NextResponse(
      JSON.stringify({
        message: "Matrix summary data fetched successfully!",
        data: {
          brands: brandSummaries,
          summary: {
            totalBrands: brandSummaries.length,
            brandsWithData: brandSummaries.filter((b) => b.hasData).length,
            avgScoreAcrossAllBrands:
              brandSummaries.length > 0
                ? Math.round(
                    (brandSummaries.reduce(
                      (sum, b) => sum + b.avgWeightedScore,
                      0
                    ) /
                      brandSummaries.length) *
                      100
                  ) / 100
                : 0,
            period,
            dateRange: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
          },
        },
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Matrix Summary API Error:", err);
    return new NextResponse(
      JSON.stringify({
        message: "Error fetching matrix summary data",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};
