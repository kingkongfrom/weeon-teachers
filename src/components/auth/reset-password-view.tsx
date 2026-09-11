"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AmbientPage } from "@/components/brand/ambient-page";
import { PasswordInput } from "@/components/ui/password-input";
import { useT } from "@/lib/i18n/client";
import {
  completePasswordResetTeacher,
  validateResetToken,
} from "@/lib/auth/password-reset-actions";

function NewPasswordSubmit() {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <button
      type="submit"
      disabled={pending}
      className="brand-gradient inline-flex h-10 w-full items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:hover:brightness-100 disabled:active:scale-100"
    >
      {pending ? t.auth.reset.saving : t.auth.reset.save}
    </button>
  );
}

function SetPasswordCard({ token }: { token: string }) {
  const t = useT();
  const [state, formAction] = useActionState(completePasswordResetTeacher, {});
  const [password, setPassword] = useState("");

  return (
    <div className="login-card rounded-2xl p-6 sm:p-8">
      <h1 className="brand-display text-3xl tracking-tight text-white">
        {t.auth.reset.title}
      </h1>
      <p className="mt-2 text-sm">{t.auth.reset.description}</p>

      <form action={formAction} className="mt-6 flex flex-col gap-5">
        <input type="hidden" name="token" value={token} />

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-semibold">
            {t.auth.reset.passwordLabel}
          </label>
          <PasswordInput
            id="password"
            name="password"
            wrapperClassName="mt-1"
            fieldClassName="login-field h-10 w-full rounded-lg border px-3 text-sm outline-none transition-all"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {password.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {t.auth.createPassword.requirements.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-xs text-white/50">
                  <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-white/10 text-[9px] text-white/40">
                    •
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {state.error && (
          <div className="rounded-xl border border-red-300/30 bg-red-500/15 px-4 py-3 text-sm text-red-100">
            {state.error}
          </div>
        )}

        <NewPasswordSubmit />
      </form>
    </div>
  );
}

function ResetController() {
  const t = useT();
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<
    { status: "pending" } | { status: "error"; error: string } | { status: "ready"; token: string }
  >({ status: "pending" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const run = async () => {
      if (!token) {
        setState({ status: "error", error: t.auth.reset.invalidBody });
        return;
      }
      const res = await validateResetToken(token);
      if (!res.ok) {
        setState({ status: "error", error: t.auth.reset.invalidBody });
        return;
      }
      setState({ status: "ready", token });
    };
    void run();
  }, [token, t.auth.reset.invalidBody]);

  if (state.status === "ready") {
    return (
      <AmbientPage>
        <SetPasswordCard token={state.token} />
      </AmbientPage>
    );
  }
  if (state.status === "error") {
    return (
      <AmbientPage>
        <div className="login-card rounded-2xl p-6 sm:p-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {t.auth.reset.invalidTitle}
          </h1>
          <p className="mt-2 text-sm text-white/60">{state.error}</p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white transition-colors hover:bg-white/15"
          >
            {t.auth.reset.requestAnother}
          </Link>
        </div>
      </AmbientPage>
    );
  }
  return (
    <AmbientPage>
      <div className="login-card rounded-2xl p-6 sm:p-8 text-center">
        <p className="text-sm text-white/60">{t.auth.reset.verifying}</p>
      </div>
    </AmbientPage>
  );
}

export function ResetPasswordView() {
  return (
    <Suspense
      fallback={
        <AmbientPage>
          <div className="login-card rounded-2xl p-6 sm:p-8 text-center">
            <p className="text-sm text-white/60">…</p>
          </div>
        </AmbientPage>
      }
    >
      <ResetController />
    </Suspense>
  );
}
