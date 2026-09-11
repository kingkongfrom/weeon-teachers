"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { AmbientPage } from "@/components/brand/ambient-page";
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
      <form
        onSubmit={onSubmit}
        className="login-card w-full rounded-2xl p-8"
      >
        <h1 className="text-xl font-semibold tracking-tight">{t.auth.createPassword.title}</h1>
        <p className="mt-1 text-sm text-foreground/60">
          {t.auth.createPassword.description}
        </p>

        <div className="mt-6">
          <label htmlFor="password" className="block text-xs font-medium text-foreground/70">
            {t.auth.createPassword.passwordLabel}
          </label>
          <PasswordInput
            id="password"
            wrapperClassName="mt-1"
            fieldClassName="login-field h-10 w-full rounded-lg border px-3 text-sm outline-none"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="mt-4">
          <label htmlFor="confirm" className="block text-xs font-medium text-foreground/70">
            {t.auth.createPassword.confirmLabel}
          </label>
          <PasswordInput
            id="confirm"
            wrapperClassName="mt-1"
            fieldClassName="login-field h-10 w-full rounded-lg border px-3 text-sm outline-none"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <ul className="mt-4 space-y-1 text-xs text-white/60">
          {t.auth.createPassword.requirements.map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>

        {error ? <p className="mt-4 text-sm text-error!">{error}</p> : null}

        <Button type="submit" className="brand-gradient mt-6 w-full border-0" disabled={pending}>
          {pending ? t.auth.createPassword.saving : t.auth.createPassword.save}
        </Button>
      </form>
    </AmbientPage>
  );
}
