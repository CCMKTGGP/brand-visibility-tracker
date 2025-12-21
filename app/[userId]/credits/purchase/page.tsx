"use client";

import CreditPurchasePage from "@/app/[userId]/brands/[brandId]/credits/purchase/page";

export default function UserCreditPurchasePage() {
  // This page reuses the existing credit purchase component
  // brandId will be undefined, which the component now handles
  return <CreditPurchasePage />;
}
