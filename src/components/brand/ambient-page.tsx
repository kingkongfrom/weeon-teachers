import type { ReactNode } from "react";
import { LoginLockup } from "@/components/brand/login-lockup";

const MARKETING_SITE_URL = "https://weeon.school";

/** Gentle navy ambient backdrop — same as weeon-tenants `AmbientBackdrop`. */
export function AmbientBackdrop() {
  return <div className="login-bg-glow" aria-hidden />;
}

/** Login chrome: navy field, wordmark (+ TEACHERS tag), then the form card. */
export function AmbientPage({ children }: { children: ReactNode }) {
  return (
    <div className="login-bg relative flex min-h-screen flex-col">
      <AmbientBackdrop />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-5">
        <a
          href={MARKETING_SITE_URL}
          className="mb-8 self-center transition-opacity hover:opacity-85"
          aria-label="Weeon School Teachers"
        >
          <LoginLockup size="lg" />
        </a>
        {children}
      </main>
    </div>
  );
}
