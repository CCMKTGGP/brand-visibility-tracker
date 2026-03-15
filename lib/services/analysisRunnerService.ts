/**
 * AnalysisRunnerService
 *
 * Contains the shared, testable core of the analysis execution loop.
 * Both the QStash workflow (production) and the local Node.js runner
 * (development) delegate to these functions — ensuring identical behaviour
 * in both environments.
 */

import AnalysisStatus from "@/lib/models/analysisStatus";
import AnalysisPair from "@/lib/models/analysisPair";
import MultiPromptAnalysis from "@/lib/models/multiPromptAnalysis";
import { AIService } from "@/lib/services/aiService";
import { DataOrganizationService } from "@/lib/services/dataOrganizationService";
import { analysisCompletionEmailTemplate } from "@/utils/analysisCompletionEmailTemplate";
import { sendEmail } from "@/utils/sendEmail";
import { Types } from "mongoose";
import { AIModel, AnalysisStage } from "@/types/brand";

interface RunAnalysisPairsParams {
  brandId: string;
  userId: string;
  analysisId: string;
  models: AIModel[];
  stages: AnalysisStage[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brand: any;
}

interface FinalizeAnalysisParams {
  brandId: string;
  userId: string;
  analysisId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brand: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  startedAt: Date;
}

export interface PairResult {
  model: AIModel;
  stage: AnalysisStage;
  skipped: boolean;
  success: boolean;
  error?: string;
}

/**
 * Runs the model × stage matrix for a given analysis.
 *
 * Key behaviours:
 * - Already-completed pairs are skipped (idempotent resume support)
 * - Each pair is wrapped in try/catch so a failure does NOT abort the loop
 * - Failed pairs are persisted with their error message
 * - Completed pairs increment the progress counter
 *
 * Returns an array of per-pair results (useful for assertions in tests).
 */
export async function runAnalysisPairs(
  params: RunAnalysisPairsParams
): Promise<PairResult[]> {
  const { brandId, userId, analysisId, models, stages, brand } = params;
  const results: PairResult[] = [];

  for (const model of models) {
    for (const stage of stages) {
      // --- Skip-completed check (idempotency for resume) ---
      const existingPair = await AnalysisPair.findOne({
        analysis_id: analysisId,
        model,
        stage,
      });

      if (existingPair?.status === "completed") {
        console.log(`⏭️ Skipping ${model}-${stage} — already completed`);
        results.push({ model, stage, skipped: true, success: true });
        continue;
      }

      console.log(`Running analysis for ${model}-${stage}`);

      // Update the global progress display
      await AnalysisStatus.findOneAndUpdate(
        { analysis_id: analysisId },
        {
          $set: {
            "progress.current_task": `Running analysis for ${model}-${stage}`,
          },
        }
      );

      // Mark this pair as running
      await AnalysisPair.findOneAndUpdate(
        { analysis_id: analysisId, model, stage },
        { status: "running" }
      );

      try {
        const result = await AIService.analyzeWithMultiplePrompts(
          brand,
          model,
          stage
        );
        if (!result) throw new Error("AI result empty");

        await DataOrganizationService.processAndStoreAnalysis(
          brandId,
          model,
          stage,
          result,
          userId,
          "manual",
          analysisId
        );

        await AnalysisPair.findOneAndUpdate(
          { analysis_id: analysisId, model, stage },
          { status: "completed" }
        );

        await AnalysisStatus.updateOne(
          { analysis_id: analysisId },
          { $inc: { "progress.completed_tasks": 1 } }
        );

        results.push({ model, stage, skipped: false, success: true });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `❌ Analysis failed for ${model}-${stage}: ${errorMessage}`
        );

        await AnalysisPair.findOneAndUpdate(
          { analysis_id: analysisId, model, stage },
          { status: "failed", error_message: errorMessage }
        );

        results.push({ model, stage, skipped: false, success: false, error: errorMessage });
      }
    }
  }

  return results;
}

/**
 * Finalises an analysis run after all pairs have been processed.
 *
 * - If any pairs remain "failed" → AnalysisStatus transitions to "failed"
 * - If all pairs succeeded → AnalysisStatus transitions to "completed" and
 *   a summary email is dispatched
 *
 * Returns the terminal status for the analysis run.
 */
export async function finalizeAnalysis(
  params: FinalizeAnalysisParams
): Promise<"completed" | "failed"> {
  const { brandId, userId, analysisId, brand, user, startedAt } = params;

  const failedPairs = await AnalysisPair.find({
    analysis_id: analysisId,
    status: "failed",
  });

  if (failedPairs.length > 0) {
    const failedSummary = failedPairs
      .map((p) => `${p.model}-${p.stage}`)
      .join(", ");

    await AnalysisStatus.updateOne(
      { analysis_id: analysisId },
      {
        $set: {
          status: "failed",
          completed_at: new Date(),
          error_message: `${failedPairs.length} pair(s) failed: ${failedSummary}`,
          "progress.current_task":
            "Analysis failed — some pairs could not be completed",
        },
      }
    );

    console.log(
      `⚠️ Analysis ${analysisId} finished with failures: ${failedSummary}`
    );
    return "failed";
  }

  // All pairs succeeded
  const analysisResults = await MultiPromptAnalysis.find({
    brand_id: new Types.ObjectId(brandId),
    createdAt: { $gte: startedAt },
  });

  const totalAnalyses = analysisResults.length;
  const avgScore =
    totalAnalyses > 0
      ? analysisResults.reduce((s, r) => s + r.overall_score, 0) / totalAnalyses
      : 0;
  const avgWeightedScore =
    totalAnalyses > 0
      ? analysisResults.reduce((s, r) => s + r.weighted_score, 0) / totalAnalyses
      : 0;

  await AnalysisStatus.updateOne(
    { analysis_id: analysisId },
    {
      $set: {
        status: "completed",
        completed_at: new Date(),
        "progress.current_task": "All analyses completed",
      },
    }
  );

  const dashboardLink = `${process.env.NEXT_PUBLIC_BASE_URL}/${userId}/brands/${brandId}/dashboard`;
  const emailTemplate = analysisCompletionEmailTemplate(
    brand.name,
    dashboardLink,
    {
      totalAnalyses,
      averageScore: Math.round(avgScore * 100) / 100,
      averageWeightedScore: Math.round(avgWeightedScore * 100) / 100,
      completionTime: Date.now() - startedAt.getTime(),
    }
  );
  await sendEmail(user.email, `Analysis Complete - ${brand.name}`, emailTemplate);

  console.log(`🎉 Analysis ${analysisId} completed successfully!`);
  return "completed";
}
