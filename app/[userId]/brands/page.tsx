// React imports
import { Suspense } from "react";

// Local imports
import Loading from "@/components/loading";
import BrandList from ".";
import { RouteParams, UserParams } from "@/types/api";

/**
 * Suspense fallback component for loading state
 *
 * @returns JSX.Element - Loading component with message
 */
function SuspenseFallback() {
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <Loading message="Loading brand list page..." />;
    </div>
  );
}
/**
 * Brands Page Component
 *
 * Displays the list of brands for a specific user with loading state.
 * Uses Suspense to handle async data loading.
 *
 * @param params - Route parameters containing userId
 * @returns JSX.Element - The brands page with suspense wrapper
 */
export default async function Page({
  params,
}: {
  params: RouteParams<UserParams>;
}) {
  const { userId } = await params;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <BrandList userId={userId} />
    </Suspense>
  );
}
