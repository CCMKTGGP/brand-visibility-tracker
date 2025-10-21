import { serve } from "@upstash/workflow/nextjs";
import { AIModel, AnalysisStage } from "@/types/brand";
import connect from "@/lib/db";
import Brand from "@/lib/models/brand";
import User from "@/lib/models/user";
import { AIService } from "@/lib/services/aiService";
import { DataOrganizationService } from "@/lib/services/dataOrganizationService";
import { analysisCompletionEmailTemplate } from "@/utils/analysisCompletionEmailTemplate";
import { sendEmail } from "@/utils/sendEmail";
import AnalysisStatus from "@/lib/models/analysisStatus";
import AnalysisPair from "@/lib/models/analysisPair";
import MultiPromptAnalysis from "@/lib/models/multiPromptAnalysis";
import { Types } from "mongoose";

export const { POST } = serve<{
  brandId: string;
  userId: string;
  analysisId: string;
  currentPair: {
    model: AIModel;
    stage: AnalysisStage;
  };
  remainingPairs: {
    model: AIModel;
    stage: AnalysisStage;
  }[];
  analysisStartedAt: string;
}>(async (context) => {
  const {
    brandId,
    userId,
    analysisId,
    currentPair,
    remainingPairs,
    analysisStartedAt,
  } = context.requestPayload;

  console.log(
    `🚀 Running analysis ${analysisId}: ${currentPair.model}-${currentPair.stage}`
  );

  // Connect to database
  await context.run("connect-db", async () => {
    await connect();
  });

  // Verify analysis is still running
  const currentAnalysis = await context.run("check-analysis-status", async () => {
    const analysis = await AnalysisStatus.findOne({
      analysis_id: analysisId,
    });

    if (!analysis) {
      console.log(`❌ Analysis ${analysisId} not found`);
      throw new Error("Analysis not found");
    }

    if (analysis.status !== "running") {
      console.log(
        `⏹️ Analysis ${analysisId} is not running (${analysis.status})`
      );
      throw new Error(`Analysis not running: ${analysis.status}`);
    }

    return analysis;
  });

  // Get brand and user details
  const { brand, user } = await context.run("get-brand-user", async () => {
    const brand = await Brand.findById(brandId);
    const user = await User.findById(userId);

    if (!brand || !user) {
      throw new Error("Brand or user not found for background analysis");
    }

    return { brand, user };
  });

  // Update progress - current task
  await context.run("update-progress-start", async () => {
    await AnalysisStatus.findOneAndUpdate(
      { analysis_id: analysisId },
      {
        $set: {
          "progress.current_task": `Running analysis for ${currentPair.model}-${currentPair.stage}`,
        },
      }
    );

    await AnalysisPair.findOneAndUpdate(
      {
        analysis_id: analysisId,
        model: currentPair.model,
        stage: currentPair.stage,
      },
      { status: "running" }
    );
  });

  // Run AI analysis - this is the long-running step
  const result = await context.run("ai-analysis", async () => {
    console.log(`🤖 Calling AI for ${currentPair.model}-${currentPair.stage}`);
    const analysisResult = await AIService.analyzeWithMultiplePrompts(
      brand,
      currentPair.model,
      currentPair.stage
    );
    
    if (!analysisResult) {
      throw new Error("AI result empty");
    }
    
    return analysisResult;
  });

  // Store results
  await context.run("store-results", async () => {
    await DataOrganizationService.processAndStoreAnalysis(
      brandId,
      currentPair.model,
      currentPair.stage,
      result,
      userId,
      "manual"
    );
  });

  // Mark pair as completed
  const completedTasks = await context.run("update-progress-complete", async () => {
    await AnalysisPair.findOneAndUpdate(
      {
        analysis_id: analysisId,
        model: currentPair.model,
        stage: currentPair.stage,
      },
      { status: "completed" }
    );

    const status = await AnalysisStatus.findOne({ analysis_id: analysisId });
    const completed = (status?.progress?.completed_tasks || 0) + 1;

    await AnalysisStatus.findOneAndUpdate(
      { analysis_id: analysisId },
      {
        $set: {
          "progress.completed_tasks": completed,
          "progress.current_task": `Completed analysis for ${currentPair.model}-${currentPair.stage}`,
        },
      }
    );

    console.log(
      `✅ Finished ${currentPair.model}-${currentPair.stage} (${completed}/${status?.progress.total_tasks})`
    );

    return completed;
  });

  // Check if there are more pairs to process
  if (remainingPairs && remainingPairs.length > 0) {
    const [nextPair, ...nextRemaining] = remainingPairs;

    console.log(`Scheduling next pair: ${nextPair.model}-${nextPair.stage}`);

    // Trigger next workflow
    await context.run("trigger-next-pair", async () => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
      const webhookUrl = `${baseUrl}/api/run-analysis`;

      // Use fetch to trigger the next workflow
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
        },
        body: JSON.stringify({
          brandId,
          userId,
          analysisId,
          currentPair: nextPair,
          remainingPairs: nextRemaining,
          analysisStartedAt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to trigger next pair: ${response.statusText}`);
      }

      console.log(`🔁 Triggered next pair: ${nextPair.model}-${nextPair.stage}`);
    });
  } else {
    // All pairs completed - finalize analysis
    await context.run("finalize-analysis", async () => {
      await AnalysisStatus.findOneAndUpdate(
        { analysis_id: analysisId },
        {
          $set: {
            status: "completed",
            completed_at: new Date(),
            "progress.current_task": "All analyses completed",
          },
        }
      );

      console.log(`🎉 Analysis ${analysisId} completed successfully!`);
    });

    // Send completion email
    await context.run("send-completion-email", async () => {
      const analysisResults = await MultiPromptAnalysis.find({
        brand_id: new Types.ObjectId(brandId),
        createdAt: { $gte: new Date(analysisStartedAt) },
      });

      const totalAnalyses = analysisResults.length;
      const totalAnalysisTime = Date.now() - new Date(analysisStartedAt).getTime();
      const avgScore =
        analysisResults.length > 0
          ? analysisResults.reduce((sum, r) => sum + r.overall_score, 0) /
            analysisResults.length
          : 0;
      const avgWeightedScore =
        analysisResults.length > 0
          ? analysisResults.reduce((sum, r) => sum + r.weighted_score, 0) /
            analysisResults.length
          : 0;

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

      console.log(`📧 Completion email sent to ${user.email}`);
    });
  }
});
