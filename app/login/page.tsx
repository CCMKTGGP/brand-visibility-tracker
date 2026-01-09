"use client";

// Next.js imports
import Link from "next/link";

// Local imports
import { LoginForm } from "@/components/forms/login-form";
import { useRef } from "react";
import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { signIn } from "next-auth/react";
import { fetchData } from "@/utils/fetch";

/**
 * Login Page Component
 *
 * Provides user authentication interface with login form,
 * social login options, and navigation to signup page.
 *
 * @returns JSX.Element - The login page interface
 */
const LoginPage: React.FC = () => {
  const linkRef = useRef<any>({});
  async function handleMicrosoftLogin() {
    try {
      const response = await fetchData("/api/login-with-microsoft");
      const { data } = response;
      linkRef.current.href = data;
      linkRef.current.click();
    } catch (err) {
      console.error(err);
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-10 right-10">
        <ModeToggle />
      </div>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center">
              <Logo />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Track how AI models describe your brand across every stage of the
            buyer journey
          </p>
        </div>

        <LoginForm />
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() =>
                signIn("google", {
                  redirect: true,
                  callbackUrl: `/auth/redirect`,
                })
              }
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="ml-2">Google</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleMicrosoftLogin}
            >
              <svg className="h-5 w-5" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              <span className="ml-2">Microsoft</span>
            </Button>
            <a ref={linkRef} className="hidden"></a>
          </div>
        </div>

        <div className="text-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-primary hover:text-primary/80"
            >
              Create Account
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
