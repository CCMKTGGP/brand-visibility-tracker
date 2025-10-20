import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import connect from "@/lib/db";
import AnalysisStatus from "@/lib/models/analysisStatus";
import Brand from "@/lib/models/brand";
import { Membership } from "@/lib/models/membership";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";

// Get analysis status for a brand
export const GET = async (request: NextRequest) => {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request);
    if (!authResult.isValid) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized access!" }),
        { status: 401 }
      );
    }
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");
    const userId = searchParams.get("userId");

    // Validate brandId
    if (!brandId || !Types.ObjectId.isValid(brandId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing brandId!" }),
        { status: 400 }
      );
    }

    // Validate userId
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing userId!" }),
        { status: 400 }
      );
    }

    // Establish database connection
    await connect();

    // Check if brand exists and user has access
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return new NextResponse(JSON.stringify({ message: "Brand not found!" }), {
        status: 404,
      });
    }

    // Check user permissions (owner or member with appropriate role)
    const membership = await Membership.findOne({
      brand_id: brandId,
      user_id: userId,
      status: "active",
    });

    const isOwner = brand.ownerId.toString() === userId;
    const hasAccess = isOwner || membership;

    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({
          message: "Insufficient permissions to view analysis status!",
        }),
        { status: 403 }
      );
    }

    // Get current running analysis for this brand
    const runningAnalysis = await AnalysisStatus.findOne({
      brand_id: brandId,
      status: "running",
    }).sort({ started_at: -1 });

    // Get recent analysis history (last 5)
    const recentAnalyses = await AnalysisStatus.find({
      brand_id: brandId,
    })
      .sort({ started_at: -1 })
      .limit(5)
      .select({
        analysis_id: 1,
        status: 1,
        models: 1,
        stages: 1,
        started_at: 1,
        completed_at: 1,
        error_message: 1,
        progress: 1,
      });

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: {
          isRunning: !!runningAnalysis,
          currentAnalysis: runningAnalysis
            ? {
                analysisId: runningAnalysis.analysis_id,
                status: runningAnalysis.status,
                models: runningAnalysis.models,
                stages: runningAnalysis.stages,
                startedAt: runningAnalysis.started_at,
                progress: runningAnalysis.progress,
              }
            : null,
          recentAnalyses: recentAnalyses.map((analysis) => ({
            analysisId: analysis.analysis_id,
            status: analysis.status,
            models: analysis.models,
            stages: analysis.stages,
            startedAt: analysis.started_at,
            completedAt: analysis.completed_at,
            errorMessage: analysis.error_message,
            progress: analysis.progress,
          })),
        },
      }),
      {
        status: 200,
      }
    );
  } catch (err) {
    console.error("Analysis Status API Error:", err);
    return new NextResponse(
      JSON.stringify({
        message: "Error fetching analysis status",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};
