"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "../tag-input";
import { useState } from "react";
import { postData } from "@/utils/fetch";
import ApiError from "../api-error";
import Loading from "../loading";
import { CATEGORIES, REGIONS } from "@/constants/onboarding-constants";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  category: z.string().min(1, "Category is required"),
  region: z.string().min(1, "Region is required"),
  targetAudience: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  useCase: z.string().optional(),
  features: z.array(z.string()).optional(),
});

export function CreateBrandForm({ userId }: { userId: string }) {
  const router = useRouter();
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
      const { data: responseData } = response;
      router.push(`/${userId}/brands/${responseData.brand._id}/dashboard`);
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl className="w-full">
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl className="w-full">
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REGIONS.map((reg) => (
                        <SelectItem key={reg} value={reg}>
                          {reg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      placeholder="Describe your brand's use case"
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
                  <FormLabel>Key Features</FormLabel>
                  <TagInput
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Press Enter to add"
                  />
                </FormItem>
              )}
            />
          </div>

          {error && (
            <ApiError message={error} setMessage={(value) => setError(value)} />
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${userId}/brands`)}
              disabled={loading}
            >
              Cancel
            </Button>
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
                loading
              }
            >
              {loading ? (
                <Loading message="Creating brand..." />
              ) : (
                "Create Brand"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
