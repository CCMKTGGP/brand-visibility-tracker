import { Suspense } from "react";
import Loading from "@/components/loading";
import EditBrand from ".";

import { RouteParams, UserBrandParams } from "@/types/api";

function SuspenseFallback() {
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <Loading message="Loading edit brand page..." />
    </div>
  );
}
export default async function Page({
  params,
}: {
  params: RouteParams<UserBrandParams>;
}) {
  const { userId, brandId } = await params;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <EditBrand userId={userId} brandId={brandId} />
    </Suspense>
  );
}
