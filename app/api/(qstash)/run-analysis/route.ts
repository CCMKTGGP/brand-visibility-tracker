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
import AnalysisPair from "@/lib/models/analysisPair";
import MultiPromptAnalysis from "@/lib/models/multiPromptAnalysis";

// Services for AI analysis and data processing
import { AIService } from "@/lib/services/aiService";
import { DataOrganizationService } from "@/lib/services/dataOrganizationService";

// Email utilities for completion notifications
import { analysisCompletionEmailTemplate } from "@/utils/analysisCompletionEmailTemplate";
import { sendEmail } from "@/utils/sendEmail";

// MongoDB utilities
import { Types } from "mongoose";

/**
 * Background Analysis Workflow Handler
 *
 * This QStash workflow processes brand visibility analysis in the background.
 * It runs AI analysis across multiple models and stages, tracks progress,
 * and sends completion notifications via email.
 *
 * Workflow payload contains:
 * - brandId: The brand to analyze
 * - userId: The user who initiated the analysis
 * - analysisId: Unique identifier for this analysis run
 * - models: Array of AI models to use (e.g., GPT-4, Claude)
 * - stages: Array of analysis stages (e.g., TOFU, MOFU, BOFU, EVFU)
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
    // Extract workflow parameters from the request payload
    const { brandId, userId, analysisId, models, stages } =
      context.requestPayload;

    // Step 1: Establish database connection
    await context.run("connect-db", async () => {
      await connect();
    });

    // Step 2: Validate analysis status and ensure it's still running
    // This prevents duplicate processing if the analysis was already completed or cancelled
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

    // Step 5: Process analysis for each model-stage combination
    // This creates a matrix of analyses (e.g., GPT-4 x Awareness, Claude x Consideration, etc.)
    for (const model of models) {
      for (const stage of stages) {
        await context.run(`running-analysis-${model}-${stage}`, async () => {
          console.log(`Running analysis for ${model}-${stage}`);

          // Update the global analysis progress to show current task
          await AnalysisStatus.findOneAndUpdate(
            { analysis_id: analysisId },
            {
              $set: {
                "progress.current_task": `Running analysis for ${model}-${stage}`,
              },
            }
          );

          // Mark this specific model-stage pair as running
          await AnalysisPair.findOneAndUpdate(
            {
              analysis_id: analysisId,
              model: model,
              stage: stage,
            },
            { status: "running" }
          );

          // Execute the AI analysis using the specified model and stage
          const result = await AIService.analyzeWithMultiplePrompts(
            brand,
            model,
            stage
          );
          if (!result) throw new Error("AI result empty");

          // Process and store the analysis results in the database
          await DataOrganizationService.processAndStoreAnalysis(
            brandId,
            model,
            stage,
            result,
            userId,
            "manual",
            analysisId // Pass the analysis_id to group all analyses from this run
          );

          // Mark this model-stage pair as completed
          await AnalysisPair.findOneAndUpdate(
            {
              analysis_id: analysisId,
              model: model,
              stage: stage,
            },
            { status: "completed" }
          );

          // Increment the global completed tasks counter
          await AnalysisStatus.updateOne(
            { analysis_id: analysisId },
            { $inc: { "progress.completed_tasks": 1 } }
          );
        });
      }
    }

    // Step 6: Finalize analysis and send completion notification
    await context.run("mark-analysis-complete", async () => {
      // Retrieve all analysis results created during this workflow run
      const analysisResults = await MultiPromptAnalysis.find({
        brand_id: new Types.ObjectId(brandId),
        createdAt: { $gte: currentAnalysis.started_at },
      });

      // Calculate summary statistics for the completion email
      const totalAnalyses = analysisResults.length;
      const totalAnalysisTime =
        Date.now() - currentAnalysis.started_at.getTime();

      // Calculate average overall score across all analyses
      const avgScore =
        analysisResults.length > 0
          ? analysisResults.reduce((sum, r) => sum + r.overall_score, 0) /
            totalAnalyses
          : 0;

      // Calculate average weighted score (accounts for stage importance)
      const avgWeightedScore =
        analysisResults.length > 0
          ? analysisResults.reduce((sum, r) => sum + r.weighted_score, 0) /
            totalAnalyses
          : 0;

      // Mark the entire analysis as completed in the database
      await AnalysisStatus.updateOne(
        { analysis_id: analysisId },
        {
          $set: {
            status: "completed",
            "progress.current_task": "All analyses completed",
          },
        }
      );

      // Send completion email notification to the user
      const dashboardLink = `${process.env.NEXT_PUBLIC_BASE_URL}/${userId}/brands/${brandId}/dashboard`;
      const emailTemplate = analysisCompletionEmailTemplate(
        brand.name,
        dashboardLink,
        {
          totalAnalyses,
          averageScore: Math.round(avgScore * 100) / 100,
          averageWeightedScore: Math.round(avgWeightedScore * 100) / 100,
          completionTime: totalAnalysisTime,
        }
      );
      await sendEmail(
        user.email,
        `Analysis Complete - ${brand.name}`,
        emailTemplate
      );

      console.log(`🎉 Analysis ${analysisId} completed successfully!`);
    });

    // Step 7: Return success response to indicate workflow completion
    return { success: true };
  }
);
