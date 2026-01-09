"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Checkbox } from "../ui/checkbox";
import Link from "next/link";
import Loading from "../loading";
import { postData } from "@/utils/fetch";
import ApiError from "../api-error";
import { useUserContext } from "@/context/userContext";

const formSchema = z
  .object({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().min(2, { message: "Please enter a valid email address" }),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(6, "Confirm Password must be at least 6 characters"),
    termsAndPrivacy: z.boolean().refine((val) => val, {
      message: "You must agree to the terms and privacy policy",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // context
  const { setUser } = useUserContext();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      termsAndPrivacy: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    try {
      const { name, email, password } = values;
      const response = await postData("/api/register", {
        full_name: name,
        email,
        password,
      });
      const { data } = response;
      const { user } = data;
      if (user) {
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("userId", user._id);
            localStorage.setItem("token", user.token);
          }
        } catch (error) {
          console.error("Error while setting token in localStorage:", error);
        }
        setUser(user);
      }
      router.push("/verify-email?email=" + encodeURIComponent(values.email));
    } catch (error) {
      setError(
        `Signup failed - ${
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
          {/* FULL NAME INPUT */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Jhon Doe"
                    autoComplete="name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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

          {/* CONFIRM PASSWORD INPUT */}
          <div className="relative">
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      autoComplete="retype-password"
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
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>

          {/* TERMS AND PRIVACY AGREEMENT */}
          <FormField
            control={form.control}
            name="termsAndPrivacy"
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
                    I agree to the{" "}
                    <Link
                      href="#"
                      target="_blank"
                      className="text-primary hover:text-primary/80"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="#"
                      target="_blank"
                      className="text-primary hover:text-primary/80"
                    >
                      Privacy Policy
                    </Link>
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>

        {error && (
          <ApiError message={error} setMessage={(value) => setError(value)} />
        )}

        <div>
          <Button
            type="submit"
            variant={loading ? "outline" : "default"}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <Loading message="Creating Account..." />
            ) : (
              "Create Account"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
