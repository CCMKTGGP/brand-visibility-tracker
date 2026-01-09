"use client";

// React imports
import { useState } from "react";

// Next.js imports
import { useRouter } from "next/navigation";
import Link from "next/link";

// Third-party imports
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";

// Local imports
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "../ui/checkbox";
import Loading from "../loading";
import { postData } from "@/utils/fetch";
import ApiError from "../api-error";
import { redirectToCurrentOnboardingStep } from "@/utils/mapCurrentOnboardingStep";
import { useUserContext } from "@/context/userContext";

// Form validation schema
const formSchema = z.object({
  email: z.string().min(2, {
    message: "Please enter a valid email address",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters",
  }),
  rememberMe: z.boolean(),
});

/**
 * Login Form Component
 *
 * Handles user authentication with email/password validation.
 * Includes password visibility toggle, remember me option, and error handling.
 * Redirects users based on their onboarding status after successful login.
 *
 * @returns JSX.Element - The login form component
 */
export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setUser } = useUserContext();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  /**
   * Handles form submission for user login
   *
   * @param values - Form values containing email, password, and rememberMe
   */
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    try {
      const { email, password } = values;
      const response = await postData("/api/login", {
        email,
        password,
      });
      const { data } = response;
      const { user } = data;
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("userId", user._id);
          localStorage.setItem("token", user.token);
        }
      } catch (error) {
        console.error("Error while setting token in localStorage:", error);
      }
      setUser(user);
      const url = redirectToCurrentOnboardingStep({
        currentOnboardingStep: data.current_onboarding_step,
        data: user,
      });
      if (url === "") {
        router.push(`/${user._id}/brands`);
      } else {
        router.push(url);
      }
    } catch (error) {
      setError(
        `Login failed - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form className="mt-8 space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          {/* EMAIL INPUT  */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="john.doe@gmail.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* PASSWORD INPUT */}
          <div className="relative">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="pr-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <button
              type="button"
              className="absolute top-[30px] right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>

          {/* REMEMBER ME AND FORGOT PASSWORD */}
          <div className="flex items-center justify-between">
            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal">
                      Remember me
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="text-sm">
              <a href="#"></a>
              <Link
                href="/forgot-password"
                className="font-medium text-primary hover:text-primary/80"
              >
                Forgot your password?
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <ApiError message={error} setMessage={(value) => setError(value)} />
        )}

        <div>
          <Button
            type="submit"
            disabled={loading}
            variant={loading ? "outline" : "default"}
            className="w-full"
          >
            {loading ? <Loading message="Signing in..." /> : "Sign in"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
