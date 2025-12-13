import { msalConfig } from "@/lib/microsoftClient";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { NextResponse } from "next/server";

const cca = new ConfidentialClientApplication(msalConfig);

export async function GET() {
  const authority = `https://login.microsoftonline.com/common/`;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/callback`;

  // Generate an authorization URL for the user to log in
  const authUrl = await cca.getAuthCodeUrl({
    scopes: ["User.Read"],
    redirectUri,
    authority,
  });

  // return NextResponse.redirect(authUrl);
  return new NextResponse(
    JSON.stringify(
      {
        message: "Login url fetched successfully!",
        data: authUrl,
      },
      null,
      4
    ),
    {
      status: 200,
    }
  );
}
