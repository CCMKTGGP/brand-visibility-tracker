"use client";

import { useState } from "react";
import ApiError from "@/components/api-error";
import { InviteTeamMemberForm } from "@/components/forms/invite-member-form";
import Logo from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function InviteMemberPage({
  userId,
  brandId,
}: {
  userId: string;
  brandId: string;
}) {
  const router = useRouter();
  const [currentStep] = useState(2);
  const [error, setError] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-10 right-10">
        <ModeToggle />
      </div>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center my-8">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Welcome to GEOStatus.cc - Full-Funnel AI Visibility
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Let&apos;s get you set up in just a few steps
          </p>
        </div>

        {/* Progress indicator */}
        <div className="my-12">
          <div className="flex items-start justify-center space-x-4">
            <div className="flex flex-col items-center gap-4">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep >= 1
                    ? "bg-accent text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                1
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create Brand
              </p>
            </div>
            <div
              className={`h-1 w-16 mt-5 ${
                currentStep >= 2 ? "bg-accent" : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
            <div className="flex flex-col gap-4 items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep >= 2
                    ? "bg-accent text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                2
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Invite Team
              </p>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 text-accent mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Invite Your Team
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Add team members to collaborate on brand tracking (optional)
                </p>
              </div>

              {error && (
                <ApiError
                  message={error}
                  setMessage={(value) => setError(value)}
                />
              )}
              <InviteTeamMemberForm
                userId={userId}
                brandId={brandId}
                showSkip
                onSuccess={(data) => {
                  // Separate successful and failed invites
                  const successfulInvites = data.filter(
                    (invite) => invite.status === "invited"
                  );
                  const failedInvites = data.filter(
                    (invite) => invite.status !== "invited"
                  );

                  // Show success toast for successful invites
                  if (successfulInvites.length > 0) {
                    const successMessage =
                      successfulInvites.length === 1
                        ? `Successfully invited ${successfulInvites[0].email}`
                        : `Successfully invited ${successfulInvites.length} members`;
                    toast.success(successMessage);
                  }

                  // Show error toast for failed invites
                  if (failedInvites.length > 0) {
                    const errorMessage =
                      failedInvites.length === 1
                        ? `Failed to invite ${failedInvites[0].email}: ${failedInvites[0].message}`
                        : `Failed to invite ${failedInvites.length} members. Check console for details.`;
                    toast.error(errorMessage);
                  }
                  router.push(`/${userId}/brands`);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
