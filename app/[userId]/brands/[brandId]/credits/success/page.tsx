"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Coins, ArrowRight } from "lucide-react";

export default function CreditPurchaseSuccessPage() {
  const router = useRouter();
  const params = useParams();
  const { userId, brandId } = params;
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Separate effect to handle navigation when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) {
      if (brandId) {
        router.push(`/${userId}/brands/${brandId}/dashboard`);
      } else {
        router.push(`/${userId}/brands`);
      }
    }
  }, [countdown, router, userId, brandId]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-800">
            Purchase Successful!
          </CardTitle>
          <CardDescription>
            Your credits have been added to your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-700">
              <Coins className="h-5 w-5 text-accent" />
              Credits Added Successfully
            </div>
            <p className="text-sm text-gray-600 mt-2">
              You can now use your credits to run brand analysis across multiple
              AI models.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() =>
                brandId
                  ? router.push(`/${userId}/brands/${brandId}/dashboard`)
                  : router.push(`/${userId}/brands`)
              }
              className="w-full"
              size="lg"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              {brandId ? "Go to Dashboard" : "Go to Brands"}
            </Button>

            <Button
              onClick={() =>
                router.push(
                  brandId
                    ? `/${userId}/brands/${brandId}/credits/purchase`
                    : `/${userId}/credits/purchase`
                )
              }
              variant="outline"
              className="w-full"
            >
              Purchase More Credits
            </Button>

            {brandId && (
              <Button
                onClick={() =>
                  router.push(`/${userId}/brands/${brandId}/credits`)
                }
                variant="ghost"
                className="w-full"
              >
                View Credit Balance
              </Button>
            )}
          </div>

          <div className="text-center text-sm text-gray-500">
            Redirecting to dashboard in {countdown} seconds...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
