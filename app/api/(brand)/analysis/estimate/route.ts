import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { CreditService } from "@/lib/services/creditService";

const EstimateAnalysisSchema = z.object({
  models: z
    .array(z.enum(["ChatGPT", "Claude", "Gemini", "Perplexity"]))
    .min(1, "At least one model is required"),
  userId: z.string().min(1, "User ID is required"),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request);
    if (!authResult.isValid) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized access!" }),
        { status: 401 }
      );
    }

    const requestBody = await request.json();
    const parse = EstimateAnalysisSchema.safeParse(requestBody);

    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid request body!",
          errors: parse.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        }),
        { status: 400 }
      );
    }

    const { models, userId } = parse.data;

    // Validate analysis request and get cost breakdown
    const validation = CreditService.validateAnalysisRequest(models);

    if (!validation.isValid) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid analysis configuration!",
          errors: validation.errors,
        }),
        { status: 400 }
      );
    }

    // Check user's current credit balance
    const currentBalance = await CreditService.getCreditBalance(userId);

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: {
          creditsRequired: validation.creditsNeeded,
          currentBalance,
          canAfford: currentBalance >= validation.creditsNeeded,
          breakdown: validation.breakdown,
          analysis: {
            models: models.length,
            stages: 4, // Always all 4 stages
            totalCombinations: models.length * 4,
          },
          estimatedTime: `${Math.ceil((models.length * 4 * 2) / 60)} minutes`, // Rough estimate
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Analysis estimate API error:", error);
    return new NextResponse(
      JSON.stringify({
        message: "Error estimating analysis cost",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}
