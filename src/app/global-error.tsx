"use client";

import { useEffect } from "react";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { ErrorScreen } from "@/components/brand/error-screen";
import { reportRenderError } from "@/lib/observability/report-render-error";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Root error boundary. Replaces the root layout, so it owns html/body, the
 * theme class, and the global stylesheet. Dark and light follow the same
 * `not-found-bg` field as the 404.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportRenderError(error, "global-error");
  }, [error]);

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script
          id="weeon-theme"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
        />
        <ErrorScreen error={error} reset={reset} />
      </body>
    </html>
  );
}
