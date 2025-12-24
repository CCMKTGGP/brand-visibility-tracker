"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateBrandForm } from "@/components/forms/create-brand-form";
import { fetchData } from "@/utils/fetch";
import Loading from "@/components/loading";
import ApiError from "@/components/api-error";
import { IBrand } from "@/types/brand";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CloneBrandPage({
  userId,
  brandId,
}: {
  userId: string;
  brandId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [brandData, setBrandData] = useState<IBrand | null>(null);

  useEffect(() => {
    async function fetchBrandData() {
      if (!brandId) {
        setError("Brand ID is required");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetchData(`/api/brand/${brandId}`);
        const { data } = response;
        setBrandData(data);
      } catch (error) {
        setError(
          `Failed to load brand data - ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setLoading(false);
      }
    }

    if (brandId) {
      fetchBrandData();
    } else {
      setLoading(false);
    }
  }, [brandId]);

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <Loading message="Loading brand data..." />
      </div>
    );
  }

  if (error && !brandData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <ApiError message={error} setMessage={setError} />
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/${userId}/brands`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Brands
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!brandData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <p className="text-gray-600 dark:text-gray-400">
              Brand not found. Please select a valid brand to clone.
            </p>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/${userId}/brands`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Brands
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare initial values for the form
  const initialValues = {
    name: brandData.name ? `${brandData.name}` : "",
    category: brandData.category || "",
    region: brandData.region || "",
    targetAudience: brandData.target_audience || [],
    competitors: brandData.competitors || [],
    useCase: brandData.use_case || "",
    features: brandData.feature_list || [],
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${userId}/brands`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Brands
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              Clone Brand
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Create a copy of &quot;{brandData.name}&quot; with pre-filled
              data. You can modify any fields before creating.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          {error && (
            <div className="mb-4">
              <ApiError message={error} setMessage={setError} />
            </div>
          )}
          <CreateBrandForm
            userId={userId}
            initialValues={initialValues}
            isClone={true}
          />
        </div>
      </div>
    </div>
  );
}
