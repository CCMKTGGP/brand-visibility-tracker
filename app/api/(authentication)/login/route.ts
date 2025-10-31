// Next.js imports
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Third-party imports
import jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";

// Local imports
import connect from "@/lib/db";
import User from "@/lib/models/user";
import { Membership } from "@/lib/models/membership";
import Brand from "@/lib/models/brand";
import { BrandSummary } from "@/types/auth";

/**
 * POST /api/login
 *
 * Authenticates a user with email and password, returns user data with JWT token
 * and associated brands (owned and member brands).
 *
 * @param request - Request object containing email and password
 * @returns NextResponse with user data and brands or error message
 */
export const POST = async (request: Request) => {
  try {
    // extract email and password from the request body
    const { email, password } = await request.json();

    // establish the connection with database
    await connect();

    // check if the user exists in the database
    const user = await User.findOne({ email });

    if (!user) {
      return new NextResponse(
        JSON.stringify({ message: "User does not exist!" }),
        { status: 400 }
      );
    }

    // check if the password hash matches or not
    if (!bcrypt.compareSync(password, user.password)) {
      return new NextResponse(
        JSON.stringify({ message: "Email or password is incorrect" }),
        { status: 400 }
      );
    }

    const ownedBrands = await Brand.find({
      ownerId: user._id,
      deletedAt: null,
    }).select(
      "_id name category region target_audience competitors use_case feature_list createdAt updatedAt"
    );

    const ownedSummaries: BrandSummary[] = ownedBrands.map(
      (b: BrandSummary) => ({
        ...b,
        _id: String(b._id),
        role: "owner",
      })
    );

    const memberships = await Membership.find({
      user_id: user._id,
      status: "active",
    })
      .select("brand_id role")
      .lean();

    const memberBrandIds = memberships.map((m) => m.brand_id);
    const memberBrands = memberBrandIds.length
      ? await Brand.find({
          _id: { $in: memberBrandIds },
          deletedAt: null,
        })
          .select(
            "_id name category region target_audience competitors use_case feature_list createdAt updatedAt"
          )
          .lean()
      : [];

    // Attach role from membership (not owner)
    const roleByBrandId = new Map<string, "admin" | "viewer" | "owner">();
    memberships.forEach((m) => roleByBrandId.set(String(m.brand_id), m.role));

    const memberSummaries: BrandSummary[] = memberBrands.map((b) => ({
      ...b,
      _id: String(b._id),
      role:
        (roleByBrandId.get(String(b._id)) as "admin" | "viewer") ?? "viewer",
    }));

    // (3) Merge + dedupe (prefer owner role when both)
    const mergedById = new Map<string, BrandSummary>();
    for (const b of [...memberSummaries, ...ownedSummaries]) {
      const key = b._id;
      if (!mergedById.has(key)) mergedById.set(key, b);
      else {
        // if both exist, ensure "owner" wins
        const prev = mergedById.get(key)!;
        if (b.role === "owner" && prev.role !== "owner") mergedById.set(key, b);
      }
    }

    const brands = Array.from(mergedById.values());

    // create a jwt token and send it as a resppnse
    const token = jwt.sign({ user }, process.env.TOKEN_SECRET || "sign");

    const response = { ...user?._doc, token };

    (await cookies()).set({
      name: "userData",
      value: JSON.stringify(response),
      httpOnly: true,
      path: "/",
    });

    return new NextResponse(
      JSON.stringify({
        message: "User fetched successfully!",
        data: {
          user: response,
          brands,
        },
      }),
      {
        status: 200,
      }
    );
  } catch (err) {
    return new NextResponse("Error in login " + err, { status: 500 });
  }
};
