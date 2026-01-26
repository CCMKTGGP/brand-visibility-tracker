import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { Types } from "mongoose";
import Brand from "@/lib/models/brand";
import MultiPromptAnalysis from "@/lib/models/multiPromptAnalysis";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { Membership } from "@/lib/models/membership";
import { z } from "zod";
import { RouteParams, BrandParams } from "@/types/api";

const TimeSeriesQuerySchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  models: z.string().optional(), // Comma-separated list of models
});

// Time-series data API endpoint
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
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const queryParams = TimeSeriesQuerySchema.parse({
      userId: searchParams.get("userId") || "",
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      models: searchParams.get("models") || undefined,
    });

    const userId = queryParams.userId;

    await connect();

    // Verify brand access
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return new NextResponse(JSON.stringify({ message: "Brand not found!" }), {
        status: 404,
      });
    }

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
      brand_id: new Types.ObjectId(brandId),
      status: "success",
    };

    // Date range filter
    if (queryParams.startDate || queryParams.endDate) {
      filter.createdAt = {};
      if (queryParams.startDate) {
        filter.createdAt.$gte = new Date(queryParams.startDate);
      }
      if (queryParams.endDate) {
        const endDate = new Date(queryParams.endDate);
        endDate.setHours(23, 59, 59, 999); // Include entire end date
        filter.createdAt.$lte = endDate;
      }
    }

    // Model filter
    if (queryParams.models) {
      const modelList = queryParams.models.split(",").map((m) => m.trim());
      filter.model = { $in: modelList };
    }

    // Aggregate time-series data grouped by date and model
    const timeSeriesData = await MultiPromptAnalysis.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            model: "$model",
          },
          avgScore: { $avg: "$overall_score" },
          count: { $sum: 1 },
          date: { $first: "$createdAt" },
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    // Transform data into the format expected by the chart
    // Group by date, then by model
    const dataByDate: Record<
      string,
      {
        ChatGPT?: number;
        Claude?: number;
        Gemini?: number;
        Perplexity?: number;
      }
    > = {};

    timeSeriesData.forEach((item) => {
      const date = item._id.date;
      const model = item._id.model;
      const score = item.avgScore;

      if (!dataByDate[date]) {
        dataByDate[date] = {};
      }

      dataByDate[date][model as keyof (typeof dataByDate)[string]] =
        Math.round(score * 100) / 100;
    });

    // Convert to array format
    const chartData = Object.entries(dataByDate).map(([date, scores]) => ({
      date,
      ...scores,
    }));

    return NextResponse.json({
      success: true,
      data: {
        timeSeries: chartData,
        metadata: {
          totalDataPoints: chartData.length,
          dateRange: {
            start: queryParams.startDate || null,
            end: queryParams.endDate || null,
          },
          models: queryParams.models
            ? queryParams.models.split(",").map((m) => m.trim())
            : ["ChatGPT", "Claude", "Gemini", "Perplexity"],
        },
      },
    });
  } catch (error) {
    console.error("Error fetching time-series data:", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid query parameters",
          errors: error.message,
        }),
        { status: 400 }
      );
    }
    return new NextResponse(
      JSON.stringify({
        message: "Failed to fetch time-series data",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};
