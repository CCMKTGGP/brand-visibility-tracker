import connect from "@/lib/db";
import jwt from "jsonwebtoken";
import User from "@/lib/models/user";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  // extract the email from the search params
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return new NextResponse(JSON.stringify({ message: "Unauthorized!" }), {
      status: 401,
    });
  }

  await connect();
  const user = await User.findOne({ email });

  if (!user) {
    return new NextResponse(
      JSON.stringify({ message: "User does not exist!" }),
      { status: 400 }
    );
  }
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
      data: response,
    }),
    {
      status: 200,
    }
  );
}
