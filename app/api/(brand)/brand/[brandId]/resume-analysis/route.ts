import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import connect from "@/lib/db";
import Brand from "@/lib/models/brand";
import User from "@/lib/models/user";
import AnalysisStatus from "@/lib/models/analysisStatus";
import AnalysisPair from "@/lib/models/analysisPair";
import { Membership } from "@/lib/models/membership";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { qstash } from "@/lib/qstash";
import { RouteParams, BrandParams } from "@/types/api";
import { AIModel, AnalysisStage } from "@/types/brand";
import {
  runAnalysisPairs,
  finalizeAnalysis,
} from "@/lib/services/analysisRunnerService";

const ResumeAnalysisSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  analysisId: z.string().min(1, "Analysis ID is required"),
});

/**
 * Local development resume runner — delegates to the shared service so
 * behaviour is identical to the QStash workflow.
 * No credits are deducted: payment was made upfront at analysis start.
 */
async function resumeFullAnalysis({
  brandId,
  userId,
  analysisId,
  models,
  stages,
}: {
  brandId: string;
  userId: string;
  analysisId: string;
  models: AIModel[];
  stages: AnalysisStage[];
}) {
  await connect();

  const currentAnalysis = await AnalysisStatus.findOne({
    analysis_id: analysisId,
  });
  if (!currentAnalysis || currentAnalysis.status !== "running") return;

  const brand = await Brand.findById(brandId);
  const user = await User.findById(userId);
  if (!brand || !user) throw new Error("Brand or user not found");

  await runAnalysisPairs({
    brandId,
    userId,
    analysisId,
    models,
    stages,
    brand,
  });
  await finalizeAnalysis({
    brandId,
    userId,
    analysisId,
    brand,
    user,
    startedAt: currentAnalysis.started_at,
  });
}

/**
 * POST /api/brand/[brandId]/resume-analysis
 *
 * Resumes a failed analysis for a brand.
 *
 * No credits are deducted — the user already paid upfront when the
 * original analysis was started. Credits are charged per analysis run,
 * not per attempt.
 *
 * What this endpoint does:
 * 1. Validates the analysis belongs to the requesting user and is "failed"
 * 2. Resets failed/running pairs → "pending"
 * 3. Resets AnalysisStatus → "running" (preserving completed_tasks count)
 * 4. Re-triggers the workflow (QStash in prod, runFullAnalysis in dev)
 *    with the same analysisId — completed pairs are skipped automatically
 */
export const POST = async (
  request: Request,
  context: { params: RouteParams<BrandParams> },
) => {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request);
    if (!authResult.isValid) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized access!" }),
        { status: 401 },
      );
    }

    const { brandId } = await context.params;

    if (!brandId || !Types.ObjectId.isValid(brandId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing brandId!" }),
        { status: 400 },
      );
    }

    const requestBody = await request.json();
    const parse = ResumeAnalysisSchema.safeParse(requestBody);

    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid request body!",
          data: `${parse.error.issues[0]?.path} - ${parse.error.issues[0]?.message}`,
        }),
        { status: 400 },
      );
    }

    const { userId, analysisId } = parse.data;

    await connect();

    // Check brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return new NextResponse(JSON.stringify({ message: "Brand not found!" }), {
        status: 404,
      });
    }

    // Check user exists
    const user = await User.findById(userId);
    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found!" }), {
        status: 404,
      });
    }

    // Check user has access to this brand
    const membership = await Membership.findOne({
      brand_id: brandId,
      user_id: userId,
      status: "active",
    });

    const isOwner = brand.ownerId.toString() === userId;
    const canTriggerAnalysis =
      isOwner || (membership && ["owner", "admin"].includes(membership.role));

    if (!canTriggerAnalysis) {
      return new NextResponse(
        JSON.stringify({
          message: "Insufficient permissions to resume analysis!",
        }),
        { status: 403 },
      );
    }

    // Find the analysis to resume — must belong to this brand and user
    const analysis = await AnalysisStatus.findOne({
      analysis_id: analysisId,
      brand_id: brandId,
      user_id: userId,
    });

    if (!analysis) {
      return new NextResponse(
        JSON.stringify({ message: "Analysis not found!" }),
        { status: 404 },
      );
    }

    // Validate terminal state — only "failed" analyses can be resumed
    if (analysis.status === "completed") {
      return new NextResponse(
        JSON.stringify({
          message: "Analysis already completed — nothing to resume.",
        }),
        { status: 400 },
      );
    }

    if (analysis.status === "running") {
      return new NextResponse(
        JSON.stringify({
          message: "Analysis is already running!",
          data: { currentAnalysisId: analysis.analysis_id },
        }),
        { status: 409 },
      );
    }

    if (analysis.status === "cancelled") {
      return new NextResponse(
        JSON.stringify({
          message: "Cancelled analyses cannot be resumed.",
        }),
        { status: 400 },
      );
    }

    // Count how many pairs are already completed (for accurate progress reset)
    const completedPairsCount = await AnalysisPair.countDocuments({
      analysis_id: analysisId,
      status: "completed",
    });

    // Reset failed and stuck-running pairs back to "pending"
    await AnalysisPair.updateMany(
      {
        analysis_id: analysisId,
        status: { $in: ["failed", "running"] },
      },
      {
        $set: { status: "pending" },
        $unset: { error_message: "" },
      },
    );

    // Reset AnalysisStatus to "running", preserving the completed_tasks count
    await AnalysisStatus.updateOne(
      { analysis_id: analysisId },
      {
        $set: {
          status: "running",
          "progress.completed_tasks": completedPairsCount,
          "progress.current_task": "Resuming analysis...",
        },
        $unset: { error_message: "", completed_at: "" },
      },
    );

    // Re-trigger the workflow with the same analysisId
    // Completed pairs are skipped inside the workflow via AnalysisPair status check
    if (process.env.NODE_ENV === "development") {
      resumeFullAnalysis({
        brandId,
        userId,
        analysisId,
        models: analysis.models as AIModel[],
        stages: analysis.stages as AnalysisStage[],
      });

      return new NextResponse(
        JSON.stringify({
          success: true,
          message:
            "Analysis resumed successfully! Retrying failed models at no additional cost.",
          data: { analysisId, status: "running", creditsCharged: 0 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
    const webhookUrl = `${baseUrl}/api/run-analysis`;

    await qstash.trigger({
      url: webhookUrl,
      body: {
        brandId,
        userId,
        analysisId,
        models: analysis.models,
        stages: analysis.stages,
      },
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        message:
          "Analysis resumed successfully! Retrying failed models at no additional cost.",
        data: { analysisId, status: "running", creditsCharged: 0 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Resume Analysis API Error:", err);
    return new NextResponse(
      JSON.stringify({
        message: "Error resuming analysis",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 },
    );
  }
};
