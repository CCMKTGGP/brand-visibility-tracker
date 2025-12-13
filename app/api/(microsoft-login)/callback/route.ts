import { CREATE_BRAND } from "@/constants/onboarding-constants";
import connect from "@/lib/db";
import { msalConfig } from "@/lib/microsoftClient";
import User from "@/lib/models/user";
import { CreditService } from "@/lib/services/creditService";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { NextRequest, NextResponse } from "next/server";

const cca = new ConfidentialClientApplication(msalConfig);

export async function GET(req: NextRequest) {
  const code: string = req.nextUrl.searchParams.get("code") as string;

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/auth/error?error=user denied access!`
    );
  }
  try {
    // get the user details from the code
    const result = await cca.acquireTokenByCode({
      code,
      scopes: ["User.Read"],
      redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/callback`,
    });

    // extract the name, email, access token and expiry from result
    const { account } = result;

    // establish the connection with database
    await connect();

    const selectedUser = await User.findOne({ email: account?.username });

    if (!selectedUser) {
      const newUser = new User({
        full_name: account?.name,
        email: account?.username,
        is_verified: true,
        current_onboarding_step: CREATE_BRAND,
      });
      await newUser.save();

      // Assign free credits to new user
      try {
        await CreditService.assignFreeCredits(newUser._id.toString());
      } catch (error) {
        console.error("Error assigning free credits:", error);
      }
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/auth/microsoft-redirect?email=${account?.username}`
    );
  } catch (error: any) {
    return new NextResponse(
      JSON.stringify({
        message: error.message,
      }),
      { status: 500 }
    );
  }
}
