"use client";

import CreditPurchaseSuccessPage from "@/app/[userId]/brands/[brandId]/credits/success/page";

export default function UserCreditPurchaseSuccessPage() {
  // Reuse the existing success page component
  // brandId will be undefined, which the component now handles
  return <CreditPurchaseSuccessPage />;
}
