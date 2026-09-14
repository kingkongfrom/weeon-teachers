import type { ReactNode } from "react";
import { LoginLockup } from "@/components/brand/login-lockup";
import { FadeIn } from "@/components/motion/fade-in";

/**
 * Night-sky backdrop shared by the auth screens (login, first password):
 * a pin-point star field under three slowly drifting aurora blobs.
 */
export function AmbientBackdrop() {
  return (
    <>
      <div className="login-stars" aria-hidden />
      <div className="aurora-blob aurora-blob-a" aria-hidden />
      <div className="aurora-blob aurora-blob-b" aria-hidden />
      <div className="aurora-blob aurora-blob-c" aria-hidden />
    </>
  );
}

/** Login chrome: aurora field, wordmark, then the form. */
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
        <FadeIn className="mb-8 self-center">
          <LoginLockup size="lg" secondary={secondary} aria-label="Weeon School" />
        </FadeIn>
        <FadeIn delay={0.08}>{children}</FadeIn>
      </main>
    </div>
  );
}
