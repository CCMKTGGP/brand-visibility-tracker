import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { Types } from "mongoose";
import Plan from "@/lib/models/plan";
import Brand from "@/lib/models/brand";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { z } from "zod";

import { RouteParams, BrandParams } from "@/types/api";

const UpdateBrandBody = z.object({
  user_id: z.string().min(1, "User ID is required"),
  name: z.string().min(1, "Brand name is required").optional(),
  category: z.string().optional(),
  region: z.string().optional(),
  use_case: z.string().optional(),
  target_audience: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  feature_list: z.array(z.string()).optional(),
});

const DeleteBrandBody = z.object({
  user_id: z.string().min(1, "User ID is required"),
});

// get brand details api
export const GET = async (
  request: Request,
  context: { params: RouteParams<BrandParams> }
) => {
  try {
    const { brandId } = await context.params;
    const url = new URL(request.url);
    const email = url.searchParams.get("email");

    // check if the brandId exist and is valid
    if (!brandId || !Types.ObjectId.isValid(brandId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing brandId!" }),
        { status: 400 }
      );
    }

    // establish the database connection
    await connect();

    // load all plans
    await Plan.find({});

    // get business details from brandId
    const brand = await Brand.findById(brandId).populate({
      path: "ownerId",
      select: ["_id", "full_name", "email"],
    });

    if (!brand) {
      return new NextResponse(
        JSON.stringify({
          message: "Brand does not exist!",
        }),
        { status: 400 }
      );
    }

    // If email is provided, fetch the invite details to get the invited_by user
    let invitedByUser = null;
    if (email) {
      const { Invite } = await import("@/lib/models/invite");

      const invite = await Invite.findOne({
        brand_id: brandId,
        email: email.toLowerCase(),
        status: "pending",
      }).populate({
        path: "invited_by",
        select: ["_id", "full_name", "email"],
      });

      if (invite && invite.invited_by) {
        invitedByUser = invite.invited_by;
      }
    }

    const responseData = {
      ...brand.toObject(),
      invitedBy: invitedByUser || brand.ownerId, // Use invited_by if available, fallback to owner
    };

    return new NextResponse(
      JSON.stringify({
        message: "Brand Details fetched successfully!",
        data: responseData,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new NextResponse("Error in fetching brand " + err, {
      status: 500,
    });
  }
};

// update brand details api
export const PUT = async (
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

    // check if the brandId exist and is valid
    if (!brandId || !Types.ObjectId.isValid(brandId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing brandId!" }),
        { status: 400 }
      );
    }

    // Parse and validate the request body
    const requestBody = await request.json();
    const parse = UpdateBrandBody.safeParse(requestBody);
    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid request body!",
          data: `${parse.error.issues[0]?.path} - ${parse.error.issues[0]?.message}`,
        }),
        { status: 400 }
      );
    }

    // establish the database connection
    await connect();

    // check if brand exists and user has permission to update
    const existingBrand = await Brand.findById(brandId).populate({
      path: "ownerId",
      select: ["_id", "email"],
    });

    if (!existingBrand) {
      return new NextResponse(
        JSON.stringify({
          message: "Brand does not exist!",
        }),
        { status: 404 }
      );
    }

    const { user_id } = parse.data;

    // TODO: Add permission check here - for now, only owner can update
    // In future, we might want to check membership role as well
    if (existingBrand.ownerId._id.toString() !== user_id) {
      return new NextResponse(
        JSON.stringify({ message: "You are not the owner of the brand!" }),
        { status: 403 }
      );
    }

    // Filter out undefined values from the update data
    const updateData = Object.fromEntries(
      Object.entries(parse.data).filter(([_, value]) => value !== undefined)
    );

    // Update the brand
    const updatedBrand = await Brand.findByIdAndUpdate(brandId, updateData, {
      new: true,
      runValidators: true,
    }).populate({
      path: "ownerId",
      select: ["_id", "full_name", "email"],
    });

    if (!updatedBrand) {
      return new NextResponse(
        JSON.stringify({
          message: "Failed to update brand!",
        }),
        { status: 500 }
      );
    }

    return new NextResponse(
      JSON.stringify({
        message: "Brand updated successfully!",
        data: updatedBrand,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new NextResponse("Error in updating brand " + err, {
      status: 500,
    });
  }
};

// delete brand api
export const DELETE = async (
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

    // check if the brandId exist and is valid
    if (!brandId || !Types.ObjectId.isValid(brandId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing brandId!" }),
        { status: 400 }
      );
    }

    const requestBody = await request.json();
    const parse = DeleteBrandBody.safeParse(requestBody);
    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid request body!",
          data: `${parse.error.issues[0]?.path} - ${parse.error.issues[0]?.message}`,
        }),
        { status: 400 }
      );
    }

    const { user_id } = parse.data;

    // establish the database connection
    await connect();

    // check if brand exists and user has permission to delete
    const existingBrand = await Brand.findById(brandId).populate({
      path: "ownerId",
      select: ["_id", "email"],
    });

    if (!existingBrand) {
      return new NextResponse(
        JSON.stringify({
          message: "Brand does not exist!",
        }),
        { status: 404 }
      );
    }

    // TODO: Add permission check here - for now, only owner can delete
    // check if the user is the owner of the brand
    if (existingBrand.ownerId._id.toString() !== user_id) {
      return new NextResponse(
        JSON.stringify({ message: "You are not the owner of the brand!" }),
        { status: 403 }
      );
    }

    // Soft delete the brand by setting deletedAt timestamp
    const deletedBrand = await Brand.findByIdAndUpdate(
      brandId,
      { deletedAt: new Date() },
      { new: true }
    );

    if (!deletedBrand) {
      return new NextResponse(
        JSON.stringify({
          message: "Failed to delete brand!",
        }),
        { status: 500 }
      );
    }

    // TODO: In future, you might want to:
    // 1. Delete related memberships
    // 2. Delete related invites
    // 3. Archive related logs/analytics data
    // 4. Send notifications to team members

    return new NextResponse(
      JSON.stringify({
        message: "Brand deleted successfully!",
        data: { brandId: deletedBrand._id },
      }),
      { status: 200 }
    );
  } catch (err) {
    return new NextResponse("Error in deleting brand " + err, {
      status: 500,
    });
  }
};
