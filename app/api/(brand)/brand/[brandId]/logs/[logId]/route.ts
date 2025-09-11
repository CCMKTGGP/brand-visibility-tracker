import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { Types } from "mongoose";
import Brand from "@/lib/models/brand";
import BrandAnalysis from "@/lib/models/brandAnalysis";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { Membership } from "@/lib/models/membership";
import { RouteParams } from "@/types/api";
import { z } from "zod";

interface LogParams {
  brandId: string;
  logId: string;
}

const UserIdSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

// Get individual log details API
export const GET = async (
  request: Request,
  context: { params: RouteParams<LogParams> }
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

    const { brandId, logId } = await context.params;
    const url = new URL(request.url);

    // Parse userId from query params
    const queryParams = {
      userId: url.searchParams.get("userId"),
    };

    const parse = UserIdSchema.safeParse(queryParams);
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

    // Validate IDs
    if (!brandId || !Types.ObjectId.isValid(brandId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing brandId!" }),
        { status: 400 }
      );
    }

    if (!logId || !Types.ObjectId.isValid(logId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing logId!" }),
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

    // Get the specific log entry
    const log = await BrandAnalysis.findOne({
      _id: logId,
      brand_id: brandId,
    })
      .populate({
        path: "metadata.user_id",
        select: "full_name email",
      })
      .lean();

    if (!log) {
      return new NextResponse(
        JSON.stringify({ message: "Log entry not found!" }),
        { status: 404 }
      );
    }

    // Transform log to match frontend expectations
    const logData = log as any; // Type assertion for complex nested structure
    const transformedLog = {
      id: logData._id.toString(),
      timestamp: logData.createdAt.toISOString(),
      updatedAt: logData.updatedAt.toISOString(),
      model: logData.model,
      stage: logData.stage,
      prompt: logData.prompt,
      response: logData.response,
      score: logData.score,
      responseTime: logData.response_time,
      successRate: logData.success_rate,
      status: logData.status,
      sentiment: {
        overall: logData.sentiment.overall,
        confidence: logData.sentiment.confidence,
        distribution: {
          positive: logData.sentiment.distribution.positive,
          neutral: logData.sentiment.distribution.neutral,
          negative: logData.sentiment.distribution.negative,
          stronglyPositive: logData.sentiment.distribution.strongly_positive,
        },
      },
      metadata: {
        userId:
          logData.metadata.user_id._id?.toString() ||
          logData.metadata.user_id.toString(),
        userName: logData.metadata.user_id.full_name || "Unknown User",
        userEmail: logData.metadata.user_id.email || "",
        triggerType: logData.metadata.trigger_type,
        version: logData.metadata.version,
      },
      brand: {
        id: brand._id.toString(),
        name: brand.name,
        category: brand.category,
        region: brand.region,
      },
    };

    return new NextResponse(
      JSON.stringify({
        message: "Log details fetched successfully!",
        data: transformedLog,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Log Details API Error:", err);
    return new NextResponse(
      JSON.stringify({
        message: "Error fetching log details",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};

// Delete log entry API
export const DELETE = async (
  request: Request,
  context: { params: RouteParams<LogParams> }
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

    const { brandId, logId } = await context.params;
    const url = new URL(request.url);

    // Parse userId from query params
    const queryParams = {
      userId: url.searchParams.get("userId"),
    };

    const parse = UserIdSchema.safeParse(queryParams);
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

    // Validate IDs
    if (!brandId || !Types.ObjectId.isValid(brandId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing brandId!" }),
        { status: 400 }
      );
    }

    if (!logId || !Types.ObjectId.isValid(logId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing logId!" }),
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

    // Check user permissions (only owner or admin can delete logs)
    const membership = await Membership.findOne({
      brand_id: brandId,
      user_id: userId,
      status: "active",
    });

    const isOwner = brand.ownerId.toString() === userId;
    const canDelete =
      isOwner || (membership && ["owner", "admin"].includes(membership.role));

    if (!canDelete) {
      return new NextResponse(
        JSON.stringify({ message: "Insufficient permissions to delete logs!" }),
        { status: 403 }
      );
    }

    // Delete the log entry
    const deletedLog = await BrandAnalysis.findOneAndDelete({
      _id: logId,
      brand_id: brandId,
    });

    if (!deletedLog) {
      return new NextResponse(
        JSON.stringify({ message: "Log entry not found!" }),
        { status: 404 }
      );
    }

    return new NextResponse(
      JSON.stringify({
        message: "Log entry deleted successfully!",
        data: {
          deletedLogId: logId,
          deletedAt: new Date().toISOString(),
          deletedBy: userId,
        },
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Delete Log API Error:", err);
    return new NextResponse(
      JSON.stringify({
        message: "Error deleting log entry",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};
