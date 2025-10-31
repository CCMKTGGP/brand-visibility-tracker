// Next.js imports
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /api/logout
 *
 * Logs out the user by deleting the userData cookie.
 *
 * @returns NextResponse with success message or error
 */
export const GET = async () => {
  try {
    (await cookies()).delete("userData");

    return new NextResponse(
      JSON.stringify({
        message: "Logout SuccessFull!",
      }),
      {
        status: 200,
      }
    );
  } catch (err) {
    return new NextResponse("Error in logout " + err, { status: 500 });
  }
};
