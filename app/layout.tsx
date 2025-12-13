// Next.js imports
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

// Styles
import "./globals.css";

// Local imports
import { ThemeProvider } from "@/context/theme-provider";
import { UserContext } from "@/context/userContext";
import { Toaster } from "@/components/ui/sonner";
import CustomSessionProvider from "@/components/session-provider";

// Font configurations
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GEO Status",
  description: "Track your brand's visibility across various AI platforms",
};

/**
 * Root Layout Component
 *
 * Main layout wrapper for the entire application.
 * Provides theme context, user context, font configuration, and toast notifications.
 *
 * @param children - Child components to render within the layout
 * @returns JSX.Element - The root layout with all providers
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster position="top-right" expand={false} />
        <CustomSessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <UserContext>{children}</UserContext>
          </ThemeProvider>
        </CustomSessionProvider>
      </body>
    </html>
  );
}
