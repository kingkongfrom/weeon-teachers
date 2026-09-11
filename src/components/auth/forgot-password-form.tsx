"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AmbientPage } from "@/components/brand/ambient-page";
import { useT } from "@/lib/i18n/client";
import { requestPasswordResetTeacher } from "@/lib/auth/password-reset-actions";

function ResetSubmitButton() {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <button
      type="submit"
      disabled={pending}
      className="brand-gradient inline-flex h-10 w-full items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:hover:brightness-100 disabled:active:scale-100"
    >
      {pending ? t.auth.forgot.submitting : t.auth.forgot.submit}
    </button>
  );
}

export function ForgotPasswordForm() {
  const t = useT();
  const [state, formAction] = useActionState(requestPasswordResetTeacher, {});

  if (state.ok) {
    return (
      <AmbientPage>
        <div className="login-card rounded-2xl p-6 sm:p-8">
          <h1 className="brand-display text-3xl tracking-tight text-white">
            {t.auth.forgot.sentTitle}
          </h1>
          <p className="mt-2 text-sm">{t.auth.forgot.sentBody}</p>
        </div>
      </AmbientPage>
    );
  }

  return (
    <AmbientPage>
      <div className="login-card rounded-2xl p-6 sm:p-8">
        <h1 className="brand-display text-3xl tracking-tight text-white">
          {t.auth.forgot.title}
        </h1>
        <p className="mt-2 text-sm">{t.auth.forgot.description}</p>

        <form action={formAction} className="mt-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-semibold">
              {t.auth.forgot.emailLabel}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="login-field h-10 w-full rounded-lg border px-3 text-sm outline-none transition-all"
              placeholder="eduardo@weeon.school"
            />
          </div>

          {state.error && (
            <div className="rounded-xl border border-red-300/30 bg-red-500/15 px-4 py-3 text-sm text-red-100">
              {state.error}
            </div>
          )}

          <ResetSubmitButton />
        </form>
      </div>
    </AmbientPage>
  );
}
