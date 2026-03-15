"use client";

import { EditBrandForm } from "@/components/forms/edit-brand-form";

export default function EditBrand({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center my-8">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Brand Settings
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            View Brand Settings and Information
          </p>
        </div>

        {/* Form Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="space-y-4">
            <EditBrandForm userId={userId} brandId={brandId} />
          </div>
        </div>
      </div>
    </div>
  );
}
