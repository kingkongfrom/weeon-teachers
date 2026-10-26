import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme/theme";
import { LocaleProvider } from "@/lib/i18n/client";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { getLocale, getT } from "@/lib/i18n/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* Brand display type — Bricolage Grotesque (shared with the marketing site). */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

/**
 * Mobile viewport. `viewport-fit=cover` lets the app paint under the notch and
 * home indicator on iPhone, which the safe-area paddings in the shell and the
 * dialogs rely on; pinch-zoom stays enabled so a teacher can still enlarge a
 * dense gradebook.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: {
      default: t.meta.appName,
      template: `%s | ${t.meta.appName}`,
    },
    description: t.meta.description,
    manifest: "/manifest.webmanifest",
    applicationName: "Weeon Docentes",
    // iOS ignores the manifest for the home-screen icon and the status bar, so
    // these two are what make an installed app look native on an iPhone/iPad.
    icons: {
      apple: "/icons/apple-touch-icon.png",
    },
    appleWebApp: {
      capable: true,
      title: "Weeon",
      statusBarStyle: "default",
    },
    formatDetection: { telephone: false },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script
          id="weeon-theme"
          async
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
        />
        <LocaleProvider locale={locale}>
          {children}
          {/* Installable-app affordance. Renders only when the browser offers
              an install and the app is not already running installed. */}
          <InstallPrompt />
        </LocaleProvider>
      </body>
    </html>
  );
}
