// Local imports
import { VERIFY_EMAIL, CREATE_BRAND } from "@/constants/onboarding-constants";
import { IUser } from "@/types/auth";

/**
 * Maps current onboarding step to appropriate redirect URL
 *
 * @param currentOnboardingStep - The user's current onboarding step
 * @param data - User data containing ID and email
 * @returns string - The URL to redirect to based on onboarding step
 */
export function redirectToCurrentOnboardingStep({
  currentOnboardingStep,
  data,
}: {
  currentOnboardingStep: string;
  data: IUser;
}) {
  switch (currentOnboardingStep) {
    case VERIFY_EMAIL:
      return `/verify-email?email=${encodeURIComponent(data.email)}`;
    case CREATE_BRAND:
      return `/${data._id}/onboarding`;
    default:
      return "";
  }
}
