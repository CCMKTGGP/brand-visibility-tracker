import { Suspense } from "react";
import Loading from "@/components/loading";
import ViewLogs from ".";

import { RouteParams, UserBrandParams } from "@/types/api";

function SuspenseFallback() {
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <Loading message="Loading view logs page..." />
    </div>
  );
}
export default async function Page({
  params,
}: {
  params: RouteParams<UserBrandParams>;
}) {
  const { brandId, userId } = await params;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <ViewLogs userId={userId} brandId={brandId} />
    </Suspense>
  );
}
