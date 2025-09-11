import { Suspense } from "react";
import Loading from "@/components/loading";
import { RouteParams, UserBrandParams } from "@/types/api";
import DashboardPage from ".";

function SuspenseFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loading message="Loading dashboard page..." />
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
      <DashboardPage userId={userId} brandId={brandId} />
    </Suspense>
  );
}
