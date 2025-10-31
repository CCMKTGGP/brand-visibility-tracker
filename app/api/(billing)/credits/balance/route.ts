// Next.js imports
import { NextRequest, NextResponse } from "next/server";

// Third-party imports
import { z } from "zod";
import { Types } from "mongoose";

// Local imports
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { CreditService } from "@/lib/services/creditService";
import connect from "@/lib/db";

// Zod validation schema
const UserIdSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

/**
 * GET /api/credits/balance
 *
 * Retrieves credit balance and statistics for a specific user.
 * Requires authentication and valid userId parameter.
 *
 * @param request - NextRequest containing userId as query parameter
 * @returns NextResponse with credit statistics or error message
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request);
    if (!authResult.isValid) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized access!" }),
        { status: 401 }
      );
    }

    await connect();

    const { searchParams } = new URL(request.url);
    const queryParams = {
      userId: searchParams.get("userId"),
    };

    const parse = UserIdSchema.safeParse(queryParams);
    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid query parameters!",
          errors: parse.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        }),
        { status: 400 }
      );
    }

    const { userId } = parse.data;

    // Validate userId
    if (!Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid userId format!" }),
        { status: 400 }
      );
    }

    const creditStats = await CreditService.getCreditStats(userId);

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: creditStats,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Get credit balance API error:", error);
    return new NextResponse(
      JSON.stringify({
        message: "Error fetching credit balance",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}
