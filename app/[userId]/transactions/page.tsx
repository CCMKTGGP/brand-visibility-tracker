import { Suspense } from "react";
import Loading from "@/components/loading";
import { RouteParams, UserParams } from "@/types/api";
import TransactionHistoryPage from "@/app/[userId]/brands/[brandId]/transactions";

function SuspenseFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loading message="Loading transactions page..." />
    </div>
  );
}

export default async function Page({
  params,
}: {
  params: RouteParams<UserParams>;
}) {
  const { userId } = await params;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <TransactionHistoryPage userId={userId} />
    </Suspense>
  );
}
