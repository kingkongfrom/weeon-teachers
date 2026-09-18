"use client";

import { useState } from "react";
import { AmbientPage } from "@/components/brand/ambient-page";
import { PasswordInput } from "@/components/ui/password-input";
import { setTeacherPassword } from "@/lib/auth/actions";
import { useT } from "@/lib/i18n/client";

export function CreatePasswordForm() {
  const t = useT();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await setTeacherPassword(password, confirm);
      if (!result.ok) {
        setError(result.error);
        return;
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AmbientPage>
      <div className="login-card rounded-2xl p-6 sm:p-8">
        <h1 className="brand-display text-3xl tracking-tight text-white">
          {t.auth.createPassword.title}
        </h1>
        <p className="mt-2 text-sm">{t.auth.createPassword.description}</p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-semibold">
              {t.auth.createPassword.passwordLabel}
            </label>
            <PasswordInput
              id="password"
              fieldClassName="login-field h-8 w-full rounded-lg border px-2.5 pr-10 text-sm outline-none transition-all"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="confirm" className="text-sm font-semibold">
              {t.auth.createPassword.confirmLabel}
            </label>
            <PasswordInput
              id="confirm"
              fieldClassName="login-field h-8 w-full rounded-lg border px-2.5 pr-10 text-sm outline-none transition-all"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <ul className="space-y-1 text-xs text-white/62">
            {t.auth.createPassword.requirements.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>

          {error ? (
            <div className="rounded-xl border border-red-300/30 bg-red-500/15 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="brand-gradient inline-flex h-10 w-full items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60 disabled:hover:brightness-100 disabled:active:scale-100"
          >
            {pending ? t.auth.createPassword.saving : t.auth.createPassword.save}
          </button>
        </form>
      </div>
    </AmbientPage>
  );
}
