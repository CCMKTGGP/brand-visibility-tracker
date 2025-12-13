import { Suspense } from "react";
import MicrosoftRedirectPage from ".";
import Loading from "@/components/loading";

// This component passed as a fallback to the Suspense boundary
// will be rendered in place of the search bar in the initial HTML.
// When the value is available during React hydration the fallback
// will be replaced with the `<SearchBar>` component.
function SearchBarFallback() {
  return <Loading message="Loading Microsoft redirect page..." />;
}

export default function Page() {
  return (
    <>
      <Suspense fallback={<SearchBarFallback />}>
        <MicrosoftRedirectPage />
      </Suspense>
    </>
  );
}
