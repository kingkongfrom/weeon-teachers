"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AmbientPage } from "@/components/brand/ambient-page";
import { PasswordInput } from "@/components/ui/password-input";
import { useT } from "@/lib/i18n/client";
import {
  completeTeacherPasswordLogin,
  startTeacherLogin,
} from "@/lib/auth/actions";

export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [askPassword, setAskPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (!askPassword) {
        const result = await startTeacherLogin(username);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        if (result.needsPassword) {
          router.replace("/crear-contrasena");
          router.refresh();
          return;
        }
        setAskPassword(true);
        return;
      }

      const result = await completeTeacherPasswordLogin(username, password);
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
          {t.auth.login.title}
        </h1>
        <p className="mt-2 text-sm">{t.auth.login.description}</p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-sm font-semibold">
              {t.auth.login.userLabel}
            </label>
            <input
              id="username"
              className="login-field h-8 rounded-lg border px-2.5 text-sm outline-none transition-all"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setAskPassword(false);
              }}
              autoComplete="username"
              placeholder="eduardo@weeon.school"
              required
            />
          </div>

          {askPassword ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-semibold">
                {t.auth.login.passwordLabel}
              </label>
              <PasswordInput
                id="password"
                fieldClassName="login-field h-8 w-full rounded-lg border px-2.5 pr-10 text-sm outline-none transition-all"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                required
              />
            </div>
          ) : null}

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
            {pending
              ? t.auth.login.submitting
              : askPassword
                ? t.auth.login.submitEnter
                : t.auth.login.submitContinue}
          </button>
        </form>

        <p className="mt-5 text-center text-xs font-medium text-white/55">
          <Link href="/forgot-password" className="transition-colors hover:text-white">
            {t.auth.login.forgot}
          </Link>
        </p>
      </div>
    </AmbientPage>
  );
}
