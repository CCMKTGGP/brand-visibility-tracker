"use client";

// React imports
import { createContext, useContext, useEffect, useState } from "react";

// Next.js imports
import { usePathname, useRouter } from "next/navigation";

// Local imports
import Loading from "@/components/loading";
import { IUser } from "@/types/auth";
import { fetchData } from "@/utils/fetch";
import { redirectToCurrentOnboardingStep } from "@/utils/mapCurrentOnboardingStep";

// Initial user state
export const INITIAL_USER_STATE: IUser = {
  _id: "",
  full_name: "",
  email: "",
  is_verified: false,
  credits_balance: 0,
};

// User context type definition
const Context = createContext<{
  user: IUser;
  setUser: (user: IUser) => void;
  toggleFetchUserDetails: boolean;
  setToggleFetchUserDetails: (value: boolean) => void;
}>({
  user: INITIAL_USER_STATE,
  setUser: () => {},
  toggleFetchUserDetails: false,
  setToggleFetchUserDetails: () => {},
});

// Authentication-related paths that don't require user context
const authPathNames = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
];

/**
 * User Context Provider Component
 *
 * Manages user authentication state and handles automatic redirects
 * based on user's onboarding status. Fetches user details on mount
 * and provides user data throughout the application.
 *
 * @param children - Child components to render within the context
 * @returns JSX.Element - The context provider with loading state
 */
export function UserContext({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const userId =
    (typeof window !== "undefined" && localStorage.getItem("userId")) ?? "";
  const [user, setUser] = useState<IUser>(INITIAL_USER_STATE);
  const [toggleFetchUserDetails, setToggleFetchUserDetails] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>();

  useEffect(() => {
    /**
     * Fetches user details and handles onboarding redirects
     *
     * @param userId - The user ID to fetch details for
     */
    async function getUserDetails(userId: string) {
      try {
        const response = await fetchData(`/api/users/${userId}`);
        const { data } = response;
        setUser(data);
        // utils for redirecting to the current onboarding step
        const matchesAuthPath = authPathNames.some((authPath) =>
          pathname.endsWith(authPath)
        );

        if (matchesAuthPath) {
          return;
        }
        const url = redirectToCurrentOnboardingStep({
          currentOnboardingStep: data.current_onboarding_step,
          data,
        });
        router.push(url);
      } catch (err: any) {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    }

    if (userId) {
      setIsLoading(true);
      getUserDetails(userId);
    }

    return () => {
      setIsLoading(false);
    };
  }, [userId, toggleFetchUserDetails]);

  return (
    <Context.Provider
      value={{
        user,
        setUser,
        toggleFetchUserDetails,
        setToggleFetchUserDetails,
      }}
    >
      {isLoading ? (
        <div className="h-[100vh] w-[100vw] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loading message="Fetching user details. Please hang on a sec!" />
          </div>
        </div>
      ) : (
        children
      )}
    </Context.Provider>
  );
}

/**
 * Hook to access user context
 *
 * @returns User context object with user state and setters
 */
export function useUserContext() {
  return useContext(Context);
}
