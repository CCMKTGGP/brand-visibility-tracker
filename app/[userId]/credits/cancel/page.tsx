"use client";

import CreditPurchaseCancelPage from "@/app/[userId]/brands/[brandId]/credits/cancel/page";

export default function UserCreditPurchaseCancelPage() {
  // Reuse the existing cancel page component
  // brandId will be undefined, which the component now handles
  return <CreditPurchaseCancelPage />;
}

