"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";

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
import { TagInput } from "../tag-input";
import { deleteData, fetchData, putData } from "@/utils/fetch";
import ApiError from "../api-error";
import Loading from "../loading";
import { toast } from "sonner";
import { AlertCircle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  category: z.string().min(1, "Category is required"),
  region: z.string().min(1, "Region is required"),
  target_audience: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  use_case: z.string().optional(),
  feature_list: z.array(z.string()).optional(),
});

export function EditBrandForm({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      region: "",
      target_audience: [],
      competitors: [],
      use_case: "",
      feature_list: [],
    },
  });

  // Fetch brand data on component mount
  useEffect(() => {
    async function fetchBrandData() {
      try {
        const response = await fetchData(`/api/brand/${brandId}`);
        const brandData = response.data;

        // Check if brand has run any analysis
        setHasRunAnalysis(brandData.hasRunAnalysis || false);

        form.reset({
          name: brandData.name || "",
          category: brandData.category || "",
          region: brandData.region || "",
          target_audience: brandData.target_audience || [],
          competitors: brandData.competitors || [],
          use_case: brandData.use_case || "",
          feature_list: brandData.feature_list || [],
        });
      } catch (error) {
        setError(
          `Error fetching brand data - ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setLoading(false);
      }
    }

    if (brandId) {
      fetchBrandData();
    }
  }, [brandId, form]);

  async function handleUpdateBrand(data: z.infer<typeof formSchema>) {
    setSaving(true);
    setError("");

    try {
      const updatePayload = {
        user_id: userId,
        name: data.name,
        category: data.category,
        region: data.region,
        competitors: data.competitors,
        use_case: data.use_case,
        target_audience: data.target_audience,
        feature_list: data.feature_list,
      };

      await putData(`/api/brand/${brandId}`, updatePayload);
      toast.success("Brand updated successfully!");
    } catch (error) {
      setError(
        `Error updating brand - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setSaving(false);
    }
  }

  const handleDeleteBrand = async () => {
    if (!brandId || !brandName) return;

    setDeleting(true);
    try {
      await deleteData(`/api/brand/${brandId}`, {
        user_id: userId,
      });
      toast.success("Brand deleted successfully!");
      setDeleteDialogOpen(false);
      setBrandName("");
      router.push(`/${userId}/brands`);
    } catch (error) {
      toast.error(
        `Error deleting brand - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading message="Loading brand details..." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      {hasRunAnalysis && (
        <>
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                  Editing is not allowed
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  This brand has already run analysis. Editing brand details is
                  disabled to prevent skewing the results. If you need to make
                  changes, you can clone the brand and make changes to the
                  cloned brand.
                </p>
              </div>
            </div>
          </div>
          <hr className="mb-8" />
        </>
      )}
      <Form {...form}>
        <form className="space-y-8">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Name *</FormLabel>
                  <FormControl>
                    <Input
                      disabled={hasRunAnalysis}
                      placeholder="Enter brand name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input
                        disabled={hasRunAnalysis}
                        placeholder="Enter category"
                        {...field}
                      />
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
                      <Input
                        disabled={hasRunAnalysis}
                        placeholder="Enter region"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name="target_audience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Audience</FormLabel>
                  <TagInput
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Press Enter to add target audience"
                    disabled={hasRunAnalysis}
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
                    placeholder="Press Enter to add competitors"
                    disabled={hasRunAnalysis}
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="use_case"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Use Case</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your brand's use case"
                      {...field}
                      rows={4}
                      disabled={hasRunAnalysis}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Controller
              control={form.control}
              name="feature_list"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Features</FormLabel>
                  <TagInput
                    value={field.value || []}
                    onChange={field.onChange}
                    placeholder="Press Enter to add key features"
                    disabled={hasRunAnalysis}
                  />
                </FormItem>
              )}
            />
          </div>

          {error && (
            <ApiError message={error} setMessage={(value) => setError(value)} />
          )}

          {/* Update Button - Only show when brand hasn't run analysis */}
          {!hasRunAnalysis && (
            <div className="flex justify-center">
              <Button
                type="button"
                className="w-[200px]"
                onClick={() => {
                  handleUpdateBrand(form.getValues());
                }}
                variant={saving ? "outline" : "default"}
                disabled={!form.watch("name") || saving}
              >
                {saving ? (
                  <Loading message="Updating brand..." />
                ) : (
                  "Update Brand"
                )}
              </Button>
            </div>
          )}

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-300">
                  Danger Zone
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400">
                  Irreversible and destructive actions
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
              onClick={() => {
                setBrandName(form.getValues().name);
                setDeleteDialogOpen(true);
              }}
              disabled={deleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Brand
            </Button>
          </div>
        </form>
      </Form>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Brand</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{brandName}&rdquo;? This
              action cannot be undone and will permanently remove all associated
              data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBrand}
              disabled={deleting}
            >
              {deleting ? (
                <Loading message="Deleting brand..." />
              ) : (
                "Delete Brand"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
