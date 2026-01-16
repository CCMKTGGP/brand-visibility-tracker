// React imports
import React from "react";

// Next.js imports
import Link from "next/link";
import Image from "next/image";

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
      <Image src="/logo.svg" alt="Surfacemap.cc" width={140} height={140} />
    </Link>
  );
}
