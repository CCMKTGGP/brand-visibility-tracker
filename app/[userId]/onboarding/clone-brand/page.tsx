import { Suspense } from "react";
import Loading from "@/components/loading";
import CloneBrandPage from ".";
import { RouteParams, UserParams } from "@/types/api";

function SuspenseFallback() {
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <Loading message="Loading clone brand form..." />
    </div>
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: RouteParams<UserParams>;
  searchParams: Promise<{ brandId?: string }>;
}) {
  const { userId } = await params;
  const { brandId } = await searchParams;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <CloneBrandPage userId={userId} brandId={brandId} />
    </Suspense>
  );
}

