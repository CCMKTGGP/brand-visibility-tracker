"use client";

// Next.js imports
import Link from "next/link";

// Local imports
import { SignupForm } from "@/components/forms/signup-form";
import Logo from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";

/**
 * Signup Page Component
 *
 * Provides user registration interface with signup form
 * and navigation to login page for existing users.
 *
 * @returns JSX.Element - The signup page interface
 */
const SignupPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-10 right-10">
        <ModeToggle />
      </div>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Track how AI models describe your brand across every stage of the
            buyer journey
          </p>
        </div>

        <SignupForm />

        <div className="text-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary/80"
            >
              Sign in
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
