import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { Types } from "mongoose";
import Brand from "@/lib/models/brand";
import BrandAnalysis from "@/lib/models/brandAnalysis";
import BrandMetrics from "@/lib/models/brandMetrics";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { Membership } from "@/lib/models/membership";
import User from "@/lib/models/user";
import { AIService } from "@/lib/services/aiService";
import { z } from "zod";
import { RouteParams, BrandParams } from "@/types/api";
import { AIModel, AnalysisStage } from "@/types/brand";

const LogsQuerySchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("50"),
  model: z
    .enum(["all", "ChatGPT", "Claude", "Gemini"])
    .optional()
    .default("all"),
  stage: z
    .enum(["all", "TOFU", "MOFU", "BOFU", "EVFU"])
    .optional()
    .default("all"),
  status: z
    .enum(["all", "success", "error", "warning"])
    .optional()
    .default("all"),
  search: z.string().optional().default(""),
  sortBy: z
    .enum(["createdAt", "score", "response_time"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

const TriggerAnalysisSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  model: z.enum(["ChatGPT", "Claude", "Gemini"]).optional(),
  stage: z.enum(["TOFU", "MOFU", "BOFU", "EVFU"]).optional(),
  prompt: z.string().min(1, "Prompt is required").optional(),
});

// Helper function to update daily metrics
async function updateDailyMetrics(brandId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's analysis data
  const todaysAnalyses = await BrandAnalysis.find({
    brand_id: brandId,
    createdAt: { $gte: today, $lt: tomorrow },
    status: "success",
  });

  if (todaysAnalyses.length === 0) return;

  // Calculate aggregated metrics
  const totalPrompts = todaysAnalyses.length;
  const avgScore =
    todaysAnalyses.reduce((sum, item) => sum + item.score, 0) / totalPrompts;
  const avgResponseTime =
    todaysAnalyses.reduce((sum, item) => sum + item.response_time, 0) /
    totalPrompts;
  const successRate =
    todaysAnalyses.reduce((sum, item) => sum + item.success_rate, 0) /
    totalPrompts;

  // Calculate model breakdown
  const modelBreakdown = {
    ChatGPT: { score: 0, prompts: 0, avgResponseTime: 0, successRate: 0 },
    Claude: { score: 0, prompts: 0, avgResponseTime: 0, successRate: 0 },
    Gemini: { score: 0, prompts: 0, avgResponseTime: 0, successRate: 0 },
  };

  todaysAnalyses.forEach((analysis) => {
    const model = analysis.model as keyof typeof modelBreakdown;
    modelBreakdown[model].score += analysis.score;
    modelBreakdown[model].prompts += 1;
    modelBreakdown[model].avgResponseTime += analysis.response_time;
    modelBreakdown[model].successRate += analysis.success_rate;
  });

  // Calculate averages for each model
  Object.keys(modelBreakdown).forEach((modelKey) => {
    const model = modelKey as keyof typeof modelBreakdown;
    if (modelBreakdown[model].prompts > 0) {
      modelBreakdown[model].score =
        modelBreakdown[model].score / modelBreakdown[model].prompts;
      modelBreakdown[model].avgResponseTime =
        modelBreakdown[model].avgResponseTime / modelBreakdown[model].prompts;
      modelBreakdown[model].successRate =
        modelBreakdown[model].successRate / modelBreakdown[model].prompts;
    }
  });

  // Calculate stage breakdown
  const stageBreakdown = { TOFU: 0, MOFU: 0, BOFU: 0, EVFU: 0 };
  const stageCounts = { TOFU: 0, MOFU: 0, BOFU: 0, EVFU: 0 };

  todaysAnalyses.forEach((analysis) => {
    const stage = analysis.stage as keyof typeof stageBreakdown;
    stageBreakdown[stage] += analysis.score;
    stageCounts[stage] += 1;
  });

  Object.keys(stageBreakdown).forEach((stageKey) => {
    const stage = stageKey as keyof typeof stageBreakdown;
    if (stageCounts[stage] > 0) {
      stageBreakdown[stage] = stageBreakdown[stage] / stageCounts[stage];
    }
  });

  // Calculate sentiment breakdown
  const sentimentBreakdown = {
    positive: 0,
    neutral: 0,
    negative: 0,
    strongly_positive: 0,
  };
  todaysAnalyses.forEach((analysis) => {
    sentimentBreakdown.positive += analysis.sentiment.distribution.positive;
    sentimentBreakdown.neutral += analysis.sentiment.distribution.neutral;
    sentimentBreakdown.negative += analysis.sentiment.distribution.negative;
    sentimentBreakdown.strongly_positive +=
      analysis.sentiment.distribution.strongly_positive;
  });

  // Calculate averages
  Object.keys(sentimentBreakdown).forEach((key) => {
    const sentimentKey = key as keyof typeof sentimentBreakdown;
    sentimentBreakdown[sentimentKey] =
      sentimentBreakdown[sentimentKey] / totalPrompts;
  });

  // Upsert the daily metrics
  await BrandMetrics.findOneAndUpdate(
    {
      brand_id: brandId,
      date: today,
      period: "daily",
    },
    {
      aggregated_data: {
        total_prompts: totalPrompts,
        avg_score: avgScore,
        avg_response_time: avgResponseTime,
        success_rate: successRate,
        model_breakdown: {
          ChatGPT: {
            score: modelBreakdown.ChatGPT.score,
            prompts: modelBreakdown.ChatGPT.prompts,
            avg_response_time: modelBreakdown.ChatGPT.avgResponseTime,
            success_rate: modelBreakdown.ChatGPT.successRate,
          },
          Claude: {
            score: modelBreakdown.Claude.score,
            prompts: modelBreakdown.Claude.prompts,
            avg_response_time: modelBreakdown.Claude.avgResponseTime,
            success_rate: modelBreakdown.Claude.successRate,
          },
          Gemini: {
            score: modelBreakdown.Gemini.score,
            prompts: modelBreakdown.Gemini.prompts,
            avg_response_time: modelBreakdown.Gemini.avgResponseTime,
            success_rate: modelBreakdown.Gemini.successRate,
          },
        },
        stage_breakdown: stageBreakdown,
        sentiment_breakdown: sentimentBreakdown,
      },
    },
    { upsert: true, new: true }
  );
}

// Brand analysis logs API
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
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
      model: url.searchParams.get("model"),
      stage: url.searchParams.get("stage"),
      status: url.searchParams.get("status"),
      search: url.searchParams.get("search"),
      sortBy: url.searchParams.get("sortBy"),
      sortOrder: url.searchParams.get("sortOrder"),
    };

    const parse = LogsQuerySchema.safeParse(queryParams);
    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid query parameters!",
          data: `${parse.error.issues[0]?.path} - ${parse.error.issues[0]?.message}`,
        }),
        { status: 400 }
      );
    }

    const {
      userId,
      page,
      limit,
      model,
      stage,
      status,
      search,
      sortBy,
      sortOrder,
    } = parse.data;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

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

    // Build filter
    const filter: any = {
      brand_id: brandId,
    };

    if (model !== "all") {
      filter.model = model;
    }
    if (stage !== "all") {
      filter.stage = stage;
    }
    if (status !== "all") {
      filter.status = status;
    }

    // Add search functionality (search in prompt and response)
    if (search) {
      filter.$or = [
        { prompt: { $regex: search, $options: "i" } },
        { response: { $regex: search, $options: "i" } },
      ];
    }

    // Get logs with pagination
    const [logs, totalCount] = await Promise.all([
      BrandAnalysis.find(filter)
        .populate({
          path: "metadata.user_id",
          select: "full_name email",
        })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      BrandAnalysis.countDocuments(filter),
    ]);

    // Transform logs to match frontend expectations
    const transformedLogs = logs.map((log) => ({
      id: (log._id as any)?.toString?.() ?? "",
      timestamp:
        log.createdAt instanceof Date ? log.createdAt.toISOString() : "",
      model: log.model,
      stage: log.stage,
      prompt: log.prompt,
      response: log.response,
      score: log.score,
      responseTime: log.response_time,
      successRate: log.success_rate,
      status: log.status,
      sentiment: {
        overall: log.sentiment.overall,
        confidence: log.sentiment.confidence,
        distribution: {
          positive: log.sentiment.distribution.positive,
          neutral: log.sentiment.distribution.neutral,
          negative: log.sentiment.distribution.negative,
          stronglyPositive: log.sentiment.distribution.strongly_positive,
        },
      },
      metadata: {
        userId:
          log.metadata.user_id._id?.toString() ||
          log.metadata.user_id.toString(),
        userName: log.metadata.user_id.full_name || "Unknown User",
        userEmail: log.metadata.user_id.email || "",
        triggerType: log.metadata.trigger_type,
        version: log.metadata.version,
      },
    }));

    // Get filter options
    const [availableModels, availableStages, availableStatuses] =
      await Promise.all([
        BrandAnalysis.distinct("model", { brand_id: brandId }),
        BrandAnalysis.distinct("stage", { brand_id: brandId }),
        BrandAnalysis.distinct("status", { brand_id: brandId }),
      ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasMore = pageNum < totalPages;
    const hasPrevious = pageNum > 1;

    const response = {
      logs: transformedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasMore,
        hasPrevious,
      },
      filters: {
        model,
        stage,
        status,
        search,
        sortBy,
        sortOrder,
        availableModels: ["all", ...availableModels],
        availableStages: ["all", ...availableStages],
        availableStatuses: ["all", ...availableStatuses],
        availableSortBy: ["createdAt", "score", "response_time"],
        availableSortOrder: ["asc", "desc"],
      },
      summary: {
        totalLogs: totalCount,
        currentPage: pageNum,
        totalPages,
        showingFrom: skip + 1,
        showingTo: Math.min(skip + limitNum, totalCount),
      },
    };

    return new NextResponse(
      JSON.stringify({
        message: "Logs fetched successfully!",
        data: response,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Logs API Error:", err);
    return new NextResponse(
      JSON.stringify({
        message: "Error fetching logs",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};

// Trigger new analysis API
export const POST = async (
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

    // Validate brandId
    if (!brandId || !Types.ObjectId.isValid(brandId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing brandId!" }),
        { status: 400 }
      );
    }

    const requestBody = await request.json();

    const parse = TriggerAnalysisSchema.safeParse(requestBody);
    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid request body!",
          data: `${parse.error.issues[0]?.path} - ${parse.error.issues[0]?.message}`,
        }),
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

    const { userId, model, stage, prompt } = parse.data;

    // Check user permissions (owner or member with appropriate role)
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
          message: "Insufficient permissions to trigger analysis!",
        }),
        { status: 403 }
      );
    }

    try {
      // Determine which models and stages to analyze
      const modelsToAnalyze: AIModel[] = model
        ? [model]
        : ["ChatGPT", "Claude", "Gemini"];
      const stagesToAnalyze: AnalysisStage[] = stage
        ? [stage]
        : ["TOFU", "MOFU", "BOFU", "EVFU"];

      const analysisResults = [];

      // Perform AI analysis for each model and stage combination
      for (const currentModel of modelsToAnalyze) {
        for (const currentStage of stagesToAnalyze) {
          try {
            const analysisResult = await AIService.analyzeBrand(
              brand,
              currentModel,
              currentStage,
              prompt
            );

            // Store the analysis result in the database
            const brandAnalysis = new BrandAnalysis({
              brand_id: brandId,
              model: currentModel,
              stage: currentStage,
              score: analysisResult.score,
              prompt: prompt || `Brand analysis for ${currentStage} stage`,
              response: analysisResult.response,
              response_time: analysisResult.responseTime,
              success_rate: analysisResult.successRate,
              sentiment: {
                overall: analysisResult.sentiment.overall,
                confidence: analysisResult.sentiment.confidence,
                distribution: {
                  positive: analysisResult.sentiment.distribution.positive,
                  neutral: analysisResult.sentiment.distribution.neutral,
                  negative: analysisResult.sentiment.distribution.negative,
                  strongly_positive:
                    analysisResult.sentiment.distribution.strongly_positive,
                },
              },
              metadata: {
                user_id: userId,
                trigger_type: "manual",
                version: "1.0",
              },
              status: analysisResult.status,
            });

            const savedAnalysis = await brandAnalysis.save();
            analysisResults.push({
              id: savedAnalysis._id.toString(),
              model: currentModel,
              stage: currentStage,
              score: analysisResult.score,
              status: analysisResult.status,
            });

            // Small delay between requests to avoid overwhelming APIs
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            console.error(
              `Analysis failed for ${currentModel}-${currentStage}:`,
              error
            );
            analysisResults.push({
              id: null,
              model: currentModel,
              stage: currentStage,
              score: 0,
              status: "error",
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      }

      // Update daily metrics (simple aggregation)
      try {
        await updateDailyMetrics(brandId);
      } catch (error) {
        console.warn("Failed to update daily metrics:", error);
      }

      return new NextResponse(
        JSON.stringify({
          message: "Analysis completed successfully!",
          data: {
            analysisResults,
            totalAnalyses: analysisResults.length,
            successfulAnalyses: analysisResults.filter(
              (r) => r.status === "success"
            ).length,
            brandId,
            triggerType: "manual",
            triggeredBy: userId,
            completedAt: new Date().toISOString(),
          },
        }),
        { status: 200 }
      );
    } catch (error) {
      console.error("Analysis processing error:", error);
      return new NextResponse(
        JSON.stringify({
          message: "Analysis failed to complete",
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Trigger Analysis API Error:", err);
    return new NextResponse(
      JSON.stringify({
        message: "Error triggering analysis",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};
