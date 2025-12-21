"use client";

import { useParams, useRouter } from "next/navigation";
import { CreditPurchase } from "@/components/credit-purchase";
import { CreditBalance } from "@/components/credit-balance";
import { useUserContext } from "@/context/userContext";
import Loading from "@/components/loading";
import { CreditStats } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CreditPurchasePage() {
  const params = useParams();
  const router = useRouter();
  const { userId, brandId } = params;
  const { user } = useUserContext();

  if (!user || !user._id) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loading message="Loading user data..." />
      </div>
    );
  }

  // Determine success/cancel URLs - use brand-specific if brandId exists, otherwise user-level
  const successUrl = brandId
    ? `${window.location.origin}/${userId}/brands/${brandId}/credits/success`
    : `${window.location.origin}/${userId}/credits/success`;
  const cancelUrl = brandId
    ? `${window.location.origin}/${userId}/brands/${brandId}/credits/cancel`
    : `${window.location.origin}/${userId}/credits/cancel`;

  return (
    <div className={`space-y-6 ${brandId ? "" : "p-12"}`}>
      {/* BACK BUTTON */}
      {!brandId && (
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Brands
        </Button>
      )}

      {/* Current Balance */}
      <div className="max-w-md">
        <CreditBalance
          showPurchaseButton={false}
          compact={false}
          creditData={
            {
              currentBalance: user.credits_balance,
              totalPurchased: user.total_credits_purchased,
              totalUsed: user.total_credits_used,
            } as CreditStats
          }
        />
      </div>

      {/* Purchase Component */}
      <CreditPurchase
        userId={user._id}
        successUrl={successUrl}
        cancelUrl={cancelUrl}
        onPurchaseStart={() => {
          console.log("Purchase started");
        }}
      />
    </div>
  );
}
