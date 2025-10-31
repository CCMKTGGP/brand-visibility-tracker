// Next.js imports
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Node.js built-in imports
import crypto from "crypto";

// Third-party imports
import * as bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Local imports
import connect from "@/lib/db";
import User from "@/lib/models/user";
import { IUser } from "@/types/auth";
import { sendEmail } from "@/utils/sendEmail";
import { verificationEmailTemplate } from "@/utils/verificationEmailTempelate";
import { VERIFY_EMAIL } from "@/constants/onboarding-constants";
import { CreditService } from "@/lib/services/creditService";

/**
 * Generates a verification token for user email verification
 *
 * @param user - User object to generate token for
 * @returns Verification token string
 */
function getVerificationToken(user: IUser): string {
  // Generate the token
  const verificationToken = crypto.randomBytes(20).toString("hex");

  // Hash the token
  user.verify_token = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  user.verify_token_expire = new Date(Date.now() + 30 * 60 * 1000);
  return verificationToken;
}

/**
 * POST /api/register
 *
 * Creates a new user account with email verification and assigns free credits.
 * Sends verification email to the provided email address.
 *
 * @param request - Request object containing full_name, email, and password
 * @returns NextResponse with user data and JWT token or error message
 */
export const POST = async (request: Request) => {
  try {
    const { full_name, email, password } = await request.json();

    // encrypt the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 12);

    // establish the connection with database
    await connect();

    // check if the user is already present or not
    const user = await User.findOne({ email });
    if (user) {
      return new NextResponse(
        JSON.stringify({
          message: "User already present with this email. Please try Login!",
        }),
        { status: 400 }
      );
    }

    // create the new user object
    const newUser = new User({
      full_name,
      email,
      password: hashedPassword,
      number_of_retries: 0,
      current_onboarding_step: VERIFY_EMAIL,
    });

    // generate a verification token for the user and save it in the database
    const verificationToken = getVerificationToken(newUser);
    await newUser.save();

    // Assign free credits to new user
    try {
      await CreditService.assignFreeCredits(newUser._id.toString());
    } catch (error) {
      console.error("Error assigning free credits:", error);
      // Don't fail registration if credit assignment fails
    }

    const verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/api/verify-email?verifyToken=${verificationToken}&id=${newUser?._id}`;
    const message = verificationEmailTemplate(verificationLink);
    // Send verification email
    await sendEmail(newUser?.email, "Email Verification", message);

    // create a jwt token and send it as a resppnse
    const token = jwt.sign({ newUser }, process.env.TOKEN_SECRET || "sign");

    const response = { ...newUser?._doc, token };

    (await cookies()).set({
      name: "userData",
      value: JSON.stringify(response),
      httpOnly: true,
      path: "/",
    });

    return new NextResponse(
      JSON.stringify({
        message: "User created successfully!",
        data: { user: response },
      }),
      {
        status: 201,
      }
    );
  } catch (err) {
    return new NextResponse("Error in creating users " + err, { status: 500 });
  }
};
