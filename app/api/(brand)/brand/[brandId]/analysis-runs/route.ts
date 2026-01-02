import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { Types } from "mongoose";
import Brand from "@/lib/models/brand";
import MultiPromptAnalysis from "@/lib/models/multiPromptAnalysis";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { Membership } from "@/lib/models/membership";
import { z } from "zod";
import { RouteParams, BrandParams } from "@/types/api";

const AnalysisRunsQuerySchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

// Get all analysis runs for a brand
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
    };

    const parse = AnalysisRunsQuerySchema.safeParse(queryParams);
    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid query parameters!",
          data: `${parse.error.issues[0]?.path} - ${parse.error.issues[0]?.message}`,
        }),
        { status: 400 }
      );
    }

    const { userId } = parse.data;

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

    // Fetch all unique analysis runs grouped by analysis_id
    // Each analysis run has a unique analysis_id that groups all model-stage combinations
    const analysisRuns = await MultiPromptAnalysis.aggregate([
      {
        $match: {
          brand_id: new Types.ObjectId(brandId),
          status: "success",
          analysis_id: { $exists: true, $ne: null }, // Only include analyses with analysis_id
        },
      },
      {
        $group: {
          _id: "$analysis_id",
          analysis_id: { $first: "$analysis_id" },
          createdAt: { $first: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $project: {
          _id: 0,
          analysis_id: 1,
          createdAt: 1,
          count: 1,
        },
      },
    ]);

    const response = {
      analysisRuns: analysisRuns.map((run) => ({
        analysis_id: run.analysis_id,
        createdAt: run.createdAt,
        count: run.count,
      })),
    };

    return new NextResponse(
      JSON.stringify({
        message: "Analysis runs fetched successfully!",
        data: response,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Analysis Runs API Error:", err);
    return new NextResponse(
      JSON.stringify({
        message: "Error fetching analysis runs",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};
