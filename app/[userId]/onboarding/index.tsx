"use client";

import OnboardingForm from "@/components/forms/onboarding-form";
import { OnboardingFormData } from "@/types/forms";
import Logo from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingPage({ userId }: { userId: string }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
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
            Welcome to GEOStatus.cc
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
                Create A Brand
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
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center mt-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Create Your First Brand
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Tell us about the brand you want to track
                </p>
              </div>
              <OnboardingForm
                userId={userId}
                setCurrentStep={setCurrentStep}
                onContinue={(value: OnboardingFormData) =>
                  router.push(`/${userId}/${value._id}/invite-member`)
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
