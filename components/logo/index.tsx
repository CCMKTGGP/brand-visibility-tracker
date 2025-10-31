// React imports
import React from "react";

// Next.js imports
import Link from "next/link";

// Third-party imports
import { Building2 } from "lucide-react";

/**
 * Logo Component
 *
 * Displays the application logo with icon and brand name.
 * Clickable link that navigates to the home page.
 *
 * @returns JSX.Element - The logo component
 */
export default function Logo() {
  return (
    <Link href="/" className="flex items-center cursor-pointer">
      <Building2 className="h-8 w-8 text-accent" />
      <span className="ml-2 text-2xl font-bold text-gray-900 dark:text-white">
        BrandViz
      </span>
    </Link>
  );
}
