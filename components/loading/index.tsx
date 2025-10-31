// React imports
import React from "react";

// Third-party imports
import { RefreshCw } from "lucide-react";

/**
 * Loading Component
 *
 * Displays a loading spinner with a custom message.
 * Used throughout the application for loading states.
 *
 * @param message - The loading message to display
 * @returns JSX.Element - The loading component with spinner and message
 */
export default function Loading({ message }: { message: string }) {
  return (
    <span className="flex items-center">
      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
      {message}
    </span>
  );
}
