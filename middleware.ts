import { NextRequest, NextResponse } from "next/server";
import { authMiddleware } from "./middlewares/apis/authMiddleware";
import { cookies } from "next/headers";
import { isRouteProtected } from "./utils/checkProtectedRoutes";

export const config = {
  matcher: [
    "/api/credit/:path*",
    "/api/analysis/:path*",
    "/api/brand/:brandId/analysis-status/:path*",
    "/api/brand/:brandId/dashboard/:path*",
    "/api/brand/:brandId/invites/:path*",
    "/api/brand/:brandId/logs/:path*",
    "/api/brand/:brandId/members/:path*",
    "/api/brand/:brandId/transactions/:path*",
    "/api/brand/:brandId/matrix/:path*",
    "/api/brand/matrix-summary/:path*",
    "/api/users/:path*",
    "/:userId/brands/:path*",
  ],
};

export default async function middleware(request: NextRequest) {
  const cookieStore = cookies();
  const userData = JSON.parse(
    (await cookieStore).get("userData")?.value || "{}"
  );

  // check if the token is present or not
  if (
    (!userData.token || userData.token.length <= 0) &&
    !request.nextUrl.pathname.toLowerCase().includes("/api")
  ) {
    const ABSOLUTE_URL = new URL("/login", request.nextUrl.origin);
    // const LOGIN = `${process.env.NEXT_PUBLIC_BASE_URL}/login?redirect=${
    //   request.nextUrl.pathname + request.nextUrl.search
    // }`;
    return NextResponse.redirect(ABSOLUTE_URL.toString());
  }

  // check if the route that you are accessing is protected and the method for it is eigther POST, PUT OR DELETE
  if (
    isRouteProtected(request.url) &&
    (request.method === "POST" ||
      request.method === "PUT" ||
      request.method === "DELETE")
  ) {
    // get the authResult form the authMiddleware
    const authResult = await authMiddleware(request);
    // if it is false then return access denined
    if (!authResult.isValid) {
      return new NextResponse(JSON.stringify({ message: "Access Denied!" }), {
        status: 401,
      });
    }
  }

  return NextResponse.next();
}
