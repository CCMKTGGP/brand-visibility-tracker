import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { Types } from "mongoose";
import Brand from "@/lib/models/brand";
import MultiPromptAnalysis from "@/lib/models/multiPromptAnalysis";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { Membership } from "@/lib/models/membership";
import { z } from "zod";
import { RouteParams, BrandParams } from "@/types/api";

const TreemapQuerySchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

// Treemap data API for competitor analysis visualization
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
    };

    const parse = TreemapQuerySchema.safeParse(queryParams);
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

    // Aggregation pipeline to extract and process competitor and domain data
    const treemapAggregation = await MultiPromptAnalysis.aggregate([
      // Stage 1: Match brand analyses
      {
        $match: {
          brand_id: new Types.ObjectId(brandId),
          status: "success",
        },
      },

      // Stage 2: Unwind prompt results to access competitors and domains
      {
        $unwind: "$prompt_results",
      },

      // Stage 3: Use $facet to process competitors and domains separately
      {
        $facet: {
          // Process competitors mentioned across all prompts
          competitors: [
            // Check if competitors_mentioned exists and is not empty
            {
              $match: {
                "prompt_results.competitors_mentioned": {
                  $exists: true,
                  $ne: [],
                },
              },
            },
            // First unwind the competitors_mentioned array
            {
              $unwind: {
                path: "$prompt_results.competitors_mentioned",
                preserveNullAndEmptyArrays: false,
              },
            },
            // Group by normalized_name to count unique competitors
            {
              $group: {
                _id: "$prompt_results.competitors_mentioned.normalized_name",
                name: { $first: "$prompt_results.competitors_mentioned.name" },
                normalized_name: {
                  $first:
                    "$prompt_results.competitors_mentioned.normalized_name",
                },
                mention_count: { $sum: 1 },
                avg_confidence_score: {
                  $avg: "$prompt_results.competitors_mentioned.confidence_score",
                },
                all_source_domains: {
                  $push: "$prompt_results.competitors_mentioned.source_domains",
                },
              },
            },
            // Flatten and deduplicate source domains
            {
              $addFields: {
                source_domains: {
                  $reduce: {
                    input: "$all_source_domains",
                    initialValue: [],
                    in: { $setUnion: ["$$value", "$$this"] },
                  },
                },
              },
            },
            // Remove the temporary field and sort
            {
              $project: {
                all_source_domains: 0,
              },
            },
            {
              $sort: { mention_count: -1 },
            },
          ],

          // Process domain citations across all prompts
          domains: [
            // Check if domain_citations exists and is not empty
            {
              $match: {
                "prompt_results.domain_citations": { $exists: true, $ne: [] },
              },
            },
            // First unwind the domain_citations array
            {
              $unwind: {
                path: "$prompt_results.domain_citations",
                preserveNullAndEmptyArrays: false,
              },
            },
            // Group by domain to count unique domains
            {
              $group: {
                _id: "$prompt_results.domain_citations.domain",
                domain: { $first: "$prompt_results.domain_citations.domain" },
                citation_count: { $sum: 1 },
                avg_authority_score: {
                  $avg: "$prompt_results.domain_citations.authority_score",
                },
                source_types: {
                  $addToSet: "$prompt_results.domain_citations.source_type",
                },
                relevance_levels: {
                  $addToSet: "$prompt_results.domain_citations.relevance",
                },
                primary_source_type: {
                  $first: "$prompt_results.domain_citations.source_type",
                },
                primary_relevance: {
                  $first: "$prompt_results.domain_citations.relevance",
                },
                reasoning: {
                  $first: "$prompt_results.domain_citations.reasoning",
                },
              },
            },
            {
              $sort: { citation_count: -1 },
            },
          ],
        },
      },
    ]);

    // Extract results from aggregation
    const aggregationResult = treemapAggregation[0] || {
      competitors: [],
      domains: [],
    };

    // Process competitors data
    const competitors = (aggregationResult.competitors || []).map(
      (comp: any) => ({
        name: comp.name,
        normalized_name: comp.normalized_name,
        confidence_score: Math.round(comp.avg_confidence_score || 0),
        source_domains: comp.source_domains || [],
        mention_count: comp.mention_count,
      })
    );

    // Process domains data
    const domains = (aggregationResult.domains || []).map((domain: any) => ({
      domain: domain.domain,
      authority_score: Math.round(domain.avg_authority_score || 0),
      source_type: domain.primary_source_type || "other",
      relevance: domain.primary_relevance || "medium",
      reasoning: domain.reasoning || "",
      citation_count: domain.citation_count,
    }));

    // Calculate summary statistics
    const totalCompetitors = competitors.length;
    const totalDomains = domains.length;
    const totalMentions = competitors.reduce(
      (sum: number, comp: any) => sum + comp.mention_count,
      0
    );
    const totalCitations = domains.reduce(
      (sum: number, domain: any) => sum + domain.citation_count,
      0
    );

    // Build response
    const response = {
      competitors,
      domains,
      totalCompetitors,
      totalDomains,
      totalMentions,
      totalCitations,
      metadata: {
        brand_id: brandId,
        generated_at: new Date().toISOString(),
        data_sources: "multi_prompt_analysis",
      },
    };

    return new NextResponse(
      JSON.stringify({
        message: "Treemap data fetched successfully!",
        data: response,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Treemap API Error:", err);
    return new NextResponse(
      JSON.stringify({
        message: "Error fetching treemap data",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};
