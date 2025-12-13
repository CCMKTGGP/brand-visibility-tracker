import GoogleProvider from "next-auth/providers/google";
import { NextAuthOptions } from "next-auth";
import connect from "@/lib/db";
import User from "@/lib/models/user";
import { CREATE_BRAND } from "@/constants/onboarding-constants";
import { CreditService } from "./services/creditService";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: [
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
          ].join(" "),
          response: "code",
        },
      },
    }),
  ],
  secret: process.env.NEXT_AUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      if (account && user) {
        const { email } = user;
        await connect();
        const selectedUser = await User.findOne({ email });

        if (!selectedUser) {
          const newUser = new User({
            full_name: user.name,
            email,
            is_verified: true,
            current_onboarding_step: CREATE_BRAND,
          });
          await newUser.save();

          // Assign free credits to new user
          try {
            await CreditService.assignFreeCredits(newUser._id.toString());
          } catch (error) {
            console.error("Error assigning free credits:", error);
            // Don't fail registration if credit assignment fails
          }
        }
      }
      return true;
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
      }
      return token;
    },
  },
  pages: {
    error: "/auth/error",
  },
};

export default authOptions;
