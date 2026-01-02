import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { Types } from "mongoose";
import Brand from "@/lib/models/brand";
import MultiPromptAnalysis from "@/lib/models/multiPromptAnalysis";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { Membership } from "@/lib/models/membership";
import { z } from "zod";
import { RouteParams, BrandParams } from "@/types/api";
import { AIModel, AnalysisStage } from "@/types/brand";
import { CreditService } from "@/lib/services/creditService";
import { qstash } from "@/lib/qstash";
import AnalysisStatus from "@/lib/models/analysisStatus";
import AnalysisPair from "@/lib/models/analysisPair";
import User from "@/lib/models/user";
import { AIService } from "@/lib/services/aiService";
import { DataOrganizationService } from "@/lib/services/dataOrganizationService";
import { analysisCompletionEmailTemplate } from "@/utils/analysisCompletionEmailTemplate";
import { sendEmail } from "@/utils/sendEmail";
import moment from "moment";

const LogsQuerySchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("50"),
  period: z.enum(["all", "7d", "30d", "90d"]).optional().default("all"),
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
    .enum(["createdAt", "overallScore", "weightedScore", "successRate"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

const TriggerAnalysisSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  models: z.array(z.enum(["ChatGPT", "Claude", "Gemini"])).optional(),
  stages: z.array(z.enum(["TOFU", "MOFU", "BOFU", "EVFU"])).optional(),
});

async function runFullAnalysis({
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
  // 1. Connect DB
  await connect();

  // 2. Check status
  const currentAnalysis = await AnalysisStatus.findOne({
    analysis_id: analysisId,
  });
  if (!currentAnalysis || currentAnalysis.status !== "running") return;

  // 3. Fetch brand + user
  const brand = await Brand.findById(brandId);
  const user = await User.findById(userId);
  if (!brand || !user) throw new Error("Brand or user not found");

  // 4. Process each model-stage combo
  for (const model of models) {
    for (const stage of stages) {
      console.log(`Running analysis for ${model}-${stage}`);

      await AnalysisStatus.findOneAndUpdate(
        { analysis_id: analysisId },
        {
          $set: {
            "progress.current_task": `Running analysis for ${model}-${stage}`,
          },
        }
      );

      await AnalysisPair.findOneAndUpdate(
        { analysis_id: analysisId, model, stage },
        { status: "running" }
      );

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
        analysisId // Pass the analysis_id to group all analyses from this run
      );

      await AnalysisPair.findOneAndUpdate(
        { analysis_id: analysisId, model, stage },
        { status: "completed" }
      );

      await AnalysisStatus.updateOne(
        { analysis_id: analysisId },
        { $inc: { "progress.completed_tasks": 1 } }
      );
    }
  }

  // 5. Finalize and send email
  const results = await MultiPromptAnalysis.find({
    brand_id: new Types.ObjectId(brandId),
    createdAt: { $gte: currentAnalysis.started_at },
  });

  const totalAnalyses = results.length;
  const avgScore = totalAnalyses
    ? results.reduce((s, r) => s + r.overall_score, 0) / totalAnalyses
    : 0;
  const avgWeightedScore = totalAnalyses
    ? results.reduce((s, r) => s + r.weighted_score, 0) / totalAnalyses
    : 0;

  await AnalysisStatus.updateOne(
    { analysis_id: analysisId },
    {
      $set: {
        status: "completed",
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
      completionTime: Date.now() - currentAnalysis.started_at.getTime(),
    }
  );

  await sendEmail(
    user.email,
    `Analysis Complete - ${brand.name}`,
    emailTemplate
  );

  console.log(`🎉 Analysis ${analysisId} completed successfully!`);
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
      period: url.searchParams.get("period"),
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
      period,
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

    // Calculate date range for period filter
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

    // Build filter - ensure brandId is properly converted to ObjectId
    const filter: any = {
      brand_id: new Types.ObjectId(brandId),
    };

    // Only add date filter if not fetching all data
    if (period !== "all") {
      filter.createdAt = { $gte: startDate, $lte: endDate };
    }

    if (model !== "all") {
      filter.model = model;
    }
    if (stage !== "all") {
      filter.stage = stage;
    }
    if (status !== "all") {
      filter.status = status;
    }

    // Add search functionality (search in prompt results)
    if (search) {
      filter.$or = [
        { "prompt_results.prompt_text": { $regex: search, $options: "i" } },
        { "prompt_results.response": { $regex: search, $options: "i" } },
      ];
    }

    // Build sort options for multi-prompt analysis
    const sortOptions: any = {};
    if (sortBy === "createdAt") {
      sortOptions.createdAt = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "overallScore") {
      sortOptions.overall_score = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "weightedScore") {
      sortOptions.weighted_score = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "successRate") {
      sortOptions.success_rate = sortOrder === "asc" ? 1 : -1;
    }

    // Single optimized aggregation pipeline for logs with user data and transformation
    const logsAggregation = await MultiPromptAnalysis.aggregate([
      // Stage 1: Match logs with filters
      {
        $match: filter,
      },

      // Stage 2: Join with user data
      {
        $lookup: {
          from: "users",
          localField: "metadata.user_id",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                full_name: 1,
                email: 1,
              },
            },
          ],
        },
      },

      // Stage 3: Use $facet to get paginated data and total count
      {
        $facet: {
          // Paginated logs with transformation
          logs: [
            { $sort: sortOptions },
            { $skip: skip },
            { $limit: limitNum },
            {
              $project: {
                id: { $toString: "$_id" },
                timestamp: {
                  $dateToString: {
                    date: "$createdAt",
                    format: "%Y-%m-%dT%H:%M:%S.%LZ",
                  },
                },
                model: 1,
                stage: 1,
                score: "$overall_score",
                weightedScore: "$weighted_score",
                responseTime: "$total_response_time",
                successRate: "$success_rate",
                status: 1,
                sentiment: {
                  overall: "$aggregated_sentiment.overall",
                  confidence: "$aggregated_sentiment.confidence",
                  distribution: {
                    positive: "$aggregated_sentiment.distribution.positive",
                    neutral: "$aggregated_sentiment.distribution.neutral",
                    negative: "$aggregated_sentiment.distribution.negative",
                    stronglyPositive:
                      "$aggregated_sentiment.distribution.strongly_positive",
                  },
                },
                promptResults: {
                  $map: {
                    input: "$prompt_results",
                    as: "result",
                    in: {
                      promptId: "$$result.prompt_id",
                      promptText: "$$result.prompt_text",
                      score: "$$result.score",
                      weightedScore: "$$result.weighted_score",
                      mentionPosition: "$$result.mention_position",
                      response: "$$result.response",
                      responseTime: "$$result.response_time",
                      sentiment: {
                        overall: "$$result.sentiment.overall",
                        confidence: "$$result.sentiment.confidence",
                        distribution: {
                          positive: "$$result.sentiment.distribution.positive",
                          neutral: "$$result.sentiment.distribution.neutral",
                          negative: "$$result.sentiment.distribution.negative",
                          stronglyPositive:
                            "$$result.sentiment.distribution.strongly_positive",
                        },
                      },
                      status: "$$result.status",
                    },
                  },
                },
                metadata: {
                  userId: { $toString: "$metadata.user_id" },
                  userName: {
                    $ifNull: [
                      { $arrayElemAt: ["$user.full_name", 0] },
                      "Unknown User",
                    ],
                  },
                  userEmail: {
                    $ifNull: [{ $arrayElemAt: ["$user.email", 0] }, ""],
                  },
                  triggerType: "$metadata.trigger_type",
                  version: "$metadata.version",
                  totalPrompts: "$metadata.total_prompts",
                  successfulPrompts: "$metadata.successful_prompts",
                },
              },
            },
          ],

          // Total count
          totalCount: [{ $count: "total" }],
        },
      },
    ]);

    // Extract results from aggregation
    const logsData = logsAggregation[0];
    const transformedLogs = logsData.logs || [];
    const totalCount = logsData.totalCount[0]?.total || 0;

    // Get filter options
    const [availableModels, availableStages, availableStatuses] =
      await Promise.all([
        MultiPromptAnalysis.distinct("model", {
          brand_id: new Types.ObjectId(brandId),
        }),
        MultiPromptAnalysis.distinct("stage", {
          brand_id: new Types.ObjectId(brandId),
        }),
        MultiPromptAnalysis.distinct("status", {
          brand_id: new Types.ObjectId(brandId),
        }),
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
        period,
        model,
        stage,
        status,
        search,
        sortBy,
        sortOrder,
        availablePeriods: ["all", "7d", "30d", "90d"],
        availableModels: ["all", ...availableModels],
        availableStages: ["all", ...availableStages],
        availableStatuses: ["all", ...availableStatuses],
        availableSortBy: [
          "createdAt",
          "overallScore",
          "weightedScore",
          "successRate",
        ],
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

    const { userId, models, stages } = parse.data;

    // check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found!" }), {
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

    // Check if there's already a running analysis for this brand
    const runningAnalysis = await AnalysisStatus.findOne({
      brand_id: brandId,
      status: "running",
    });

    if (runningAnalysis) {
      return new NextResponse(
        JSON.stringify({
          message: "Analysis is already running for this brand!",
          data: {
            currentAnalysisId: runningAnalysis.analysis_id,
            startedAt: runningAnalysis.started_at,
            models: runningAnalysis.models,
            stages: runningAnalysis.stages,
            progress: runningAnalysis.progress,
          },
        }),
        { status: 409 } // Conflict
      );
    }

    // Default to all models and stages if not specified
    const modelsToAnalyze: AIModel[] = models || [
      "ChatGPT",
      "Claude",
      "Gemini",
    ];
    const stagesToAnalyze: AnalysisStage[] = stages || [
      "TOFU",
      "MOFU",
      "BOFU",
      "EVFU",
    ];

    // Validate analysis request and check credits
    const validation = CreditService.validateAnalysisRequest(modelsToAnalyze);

    if (!validation.isValid) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid analysis request!",
          errors: validation.errors,
        }),
        { status: 400 }
      );
    }

    // Check if user has enough credits
    const creditCheck = await CreditService.hasEnoughCredits(
      userId,
      validation.creditsNeeded
    );

    if (!creditCheck.hasEnough) {
      return new NextResponse(
        JSON.stringify({
          message: "Insufficient credits for this analysis!",
          data: {
            required: validation.creditsNeeded,
            available: creditCheck.currentBalance,
            breakdown: validation.breakdown,
          },
        }),
        { status: 402 } // Payment Required
      );
    }

    // Generate human-readable analysis ID for tracking
    const analysisId = `ANL-${moment().format("DD MMM, YYYY | hh:mm a")}`;

    // Create all model-stage combinations (pairs)
    const pairs = [];
    for (const model of modelsToAnalyze) {
      for (const stage of stagesToAnalyze) {
        pairs.push({
          model,
          stage,
          status: "pending" as const,
        });
      }
    }

    // Create analysis status record with pairs
    const totalTasks = modelsToAnalyze.length * stagesToAnalyze.length;
    await AnalysisStatus.create({
      brand_id: brandId,
      user_id: userId,
      analysis_id: analysisId,
      status: "running",
      models: modelsToAnalyze,
      stages: stagesToAnalyze,
      started_at: new Date(),
      progress: {
        total_tasks: totalTasks,
        completed_tasks: 0,
        current_task: "Initializing analysis...",
      },
    });

    // Create individual AnalysisPair documents for detailed tracking
    const pairDocuments = pairs.map((pair) => ({
      analysis_id: analysisId,
      brand_id: brandId,
      user_id: userId,
      model: pair.model,
      stage: pair.stage,
      status: pair.status,
    }));

    await AnalysisPair.insertMany(pairDocuments);

    let newBalance: number = user.credits_balance;
    let totalCreditUsed: number = user.total_credits_used;
    // Deduct credits before starting analysis
    try {
      const {
        newBalance: newBalanceResult,
        totalCreditUsed: totalCreditUsedResult,
      } = await CreditService.deductCredits(
        userId,
        validation.creditsNeeded,
        analysisId,
        `Analysis for brand: ${brand.name} (${modelsToAnalyze.join(
          ", "
        )} - ${stagesToAnalyze.join(", ")})`
      );
      newBalance = newBalanceResult;
      totalCreditUsed = totalCreditUsedResult;
    } catch (error) {
      console.error("Error deducting credits:", error);
      return new NextResponse(
        JSON.stringify({
          message: "Error processing credits. Please try again.",
        }),
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === "development") {
      runFullAnalysis({
        brandId,
        userId,
        analysisId,
        models: modelsToAnalyze,
        stages: stagesToAnalyze,
      });

      // Return immediate response
      return new NextResponse(
        JSON.stringify({
          success: true,
          message:
            "Analysis started successfully! You will receive an email notification once the analysis is complete.",
          data: {
            analysisId,
            status: "started",
            estimatedCompletionTime: "5-10 minutes",
            notificationEmail:
              "You will receive an email when analysis is complete",
            creditsUsed: validation.creditsNeeded,
            modelsAnalyzed: modelsToAnalyze,
            stagesAnalyzed: stagesToAnalyze,
            newBalance,
            totalCreditUsed,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Schedule recurring QStash jobs every 10 minutes
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
    const webhookUrl = `${baseUrl}/api/run-analysis`;

    console.log(`Scheduling recurring analysis jobs for ${webhookUrl}`);
    // Start analysis in background
    console.log(`Triggering background analysis for brand ${brand.name}`);

    // trigger our qstash workflow
    await qstash.trigger({
      url: webhookUrl,
      body: {
        brandId,
        userId,
        analysisId,
        models: modelsToAnalyze,
        stages: stagesToAnalyze,
      },
    });

    // Return immediate response
    return new NextResponse(
      JSON.stringify({
        success: true,
        message:
          "Analysis started successfully! You will receive an email notification once the analysis is complete.",
        data: {
          analysisId,
          status: "started",
          estimatedCompletionTime: "5-10 minutes",
          notificationEmail:
            "You will receive an email when analysis is complete",
          creditsUsed: validation.creditsNeeded,
          modelsAnalyzed: modelsToAnalyze,
          stagesAnalyzed: stagesToAnalyze,
          newBalance,
          totalCreditUsed,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
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
