"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { TagInput } from "../tag-input";
import { useState } from "react";
import { postData } from "@/utils/fetch";
import ApiError from "../api-error";
import Loading from "../loading";
import { OnboardingFormData } from "@/types/forms";

const formSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  category: z.string().min(1, "Category is required"),
  region: z.string().min(1, "Region is required"),
  targetAudience: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  useCase: z.string().optional(),
  features: z.array(z.string()).optional(),
});

export default function OnboardingForm({
  userId,
  setCurrentStep,
  onContinue,
}: {
  userId: string;
  setCurrentStep: (step: number) => void;
  onContinue: (data: OnboardingFormData) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      region: "",
      targetAudience: [],
      competitors: [],
      useCase: "",
      features: [],
    },
  });

  async function handleCreateBrand(data: z.infer<typeof formSchema>) {
    const {
      name,
      category,
      region,
      competitors,
      features,
      targetAudience,
      useCase,
    } = data;
    setLoading(true);
    try {
      const response = await postData(`/api/brand`, {
        user_id: userId,
        name,
        category,
        region,
        competitors,
        use_case: useCase,
        target_audience: targetAudience,
        feature_list: features,
      });
      const { data } = response;
      setCurrentStep(2);
      onContinue(data.brand);
    } catch (error) {
      setError(
        `Error in creating brand - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Form {...form}>
        <form className="space-y-8">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter brand name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter category" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter region" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              control={form.control}
              name="targetAudience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Audience</FormLabel>
                  <TagInput
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Press Enter to add"
                  />
                  <FormDescription
                    className={`text-xs text-gray-500 ${
                      field.value && field.value.length > 0
                        ? "mt-[-5px]"
                        : "mt-[-10px]"
                    }`}
                  >
                    Add multiple target audiences by hitting Enter/Return
                  </FormDescription>
                </FormItem>
              )}
            />

            <Controller
              control={form.control}
              name="competitors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Main Competitors</FormLabel>
                  <TagInput
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Press Enter to add"
                  />
                  <FormDescription
                    className={`text-xs text-gray-500 ${
                      field.value && field.value.length > 0
                        ? "mt-[-5px]"
                        : "mt-[-10px]"
                    }`}
                  >
                    Add multiple competitors by hitting Enter/Return
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="useCase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Use Case</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a use case, product, or service your brand offers"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Controller
              control={form.control}
              name="features"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Features or Benefits</FormLabel>
                  <TagInput
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Press Enter to add"
                  />
                  <FormDescription
                    className={`text-xs text-gray-500 ${
                      field.value && field.value.length > 0
                        ? "mt-[-5px]"
                        : "mt-[-10px]"
                    }`}
                  >
                    Add multiple key features by hitting Enter/Return
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>

          {error && (
            <ApiError message={error} setMessage={(value) => setError(value)} />
          )}

          {/* Navigation */}
          <div className="flex justify-center">
            <Button
              type="button"
              className="w-[200px]"
              onClick={() => {
                handleCreateBrand(form.getValues());
              }}
              variant={loading ? "outline" : "default"}
              disabled={
                !form.watch("name") ||
                !form.watch("category") ||
                !form.watch("region") ||
                !form.watch("targetAudience") ||
                !form.watch("competitors") ||
                !form.watch("useCase") ||
                !form.watch("features") ||
                loading
              }
            >
              {loading ? <Loading message="Creating brand..." /> : "Continue"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
