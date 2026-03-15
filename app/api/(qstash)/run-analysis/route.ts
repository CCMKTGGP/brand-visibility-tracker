// QStash workflow imports for background job processing
import { serve } from "@upstash/workflow/nextjs";
import { WorkflowContext } from "@upstash/workflow";

// Type definitions for analysis models and stages
import { AIModel, AnalysisStage } from "@/types/brand";

// Database connection and models
import connect from "@/lib/db";
import Brand from "@/lib/models/brand";
import User from "@/lib/models/user";
import AnalysisStatus from "@/lib/models/analysisStatus";

// Shared analysis runner (used by both QStash and local dev runner)
import {
  runAnalysisPairs,
  finalizeAnalysis,
} from "@/lib/services/analysisRunnerService";

/**
 * Background Analysis Workflow Handler
 *
 * This QStash workflow processes brand visibility analysis in the background.
 * It delegates the model × stage matrix to runAnalysisPairs and the
 * terminal-status logic to finalizeAnalysis.
 *
 * Resume behaviour:
 * - Re-triggering with the same analysisId is safe — pairs already marked
 *   "completed" in AnalysisPair are skipped by runAnalysisPairs, so no
 *   work is duplicated and no extra credits are charged.
 */
export const { POST } = serve(
  async (
    context: WorkflowContext<{
      brandId: string;
      userId: string;
      analysisId: string;
      models: AIModel[];
      stages: AnalysisStage[];
    }>
  ) => {
    const { brandId, userId, analysisId, models, stages } =
      context.requestPayload;

    // Step 1: Establish database connection
    await context.run("connect-db", async () => {
      await connect();
    });

    // Step 2: Validate analysis status and ensure it's still running
    const currentAnalysis = await AnalysisStatus.findOne({
      analysis_id: analysisId,
    });

    if (!currentAnalysis) {
      console.log(`❌ Analysis ${analysisId} not found`);
      return;
    }

    if (currentAnalysis.status !== "running") {
      console.log(
        `⏹️ Analysis ${analysisId} is not running (${currentAnalysis.status})`
      );
      return;
    }

    // Step 3: Fetch brand and user data required for analysis
    const brand = await Brand.findById(brandId);
    const user = await User.findById(userId);

    if (!brand || !user) {
      throw new Error("Brand or user not found for background analysis");
    }

    // Step 4: Process analysis for each model-stage combination
    // Each pair runs inside its own context.run() step so QStash can
    // cache results and skip re-execution on retries.
    for (const model of models) {
      for (const stage of stages) {
        await context.run(`running-analysis-${model}-${stage}`, async () => {
          await runAnalysisPairs({
            brandId,
            userId,
            analysisId,
            models: [model],
            stages: [stage],
            brand,
          });
        });
      }
    }

    // Step 5: Finalise — set terminal status and send email if all succeeded
    await context.run("finalize-analysis", async () => {
      await finalizeAnalysis({
        brandId,
        userId,
        analysisId,
        brand,
        user,
        startedAt: currentAnalysis.started_at,
      });
    });

    return { success: true };
  }
);
