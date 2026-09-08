import type { ReactNode } from "react";
import { LoginLockup } from "@/components/brand/login-lockup";

/** Gentle navy ambient backdrop shared by the auth screens (login, first password). */
export function AmbientBackdrop() {
  return <div className="login-bg-glow" aria-hidden />;
}

/** Login chrome: navy field, wordmark, then the form. */
export function AmbientPage({
  children,
  secondary = "School",
}: {
  children: ReactNode;
  secondary?: string;
}) {
  return (
    <div className="login-bg relative flex min-h-screen flex-col">
      <AmbientBackdrop />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:px-5">
        <div className="mb-8 self-center" aria-label="Weeon School">
          <LoginLockup size="lg" secondary={secondary} />
        </div>
        {children}
      </main>
    </div>
  );
}
