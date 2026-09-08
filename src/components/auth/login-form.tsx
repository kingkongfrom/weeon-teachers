"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { AmbientPage } from "@/components/brand/ambient-page";
import {
  completeTeacherPasswordLogin,
  startTeacherLogin,
} from "@/lib/auth/actions";

export function LoginForm() {
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
      router.replace("/grupos");
      router.refresh();
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
        <h1 className="text-xl font-semibold tracking-tight">Ingreso docentes</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Ingrese el usuario que le asignó la administración, o su correo si ya
          tiene contraseña.
        </p>

        <label className="mt-6 block text-xs font-medium text-foreground/70">
          Usuario o correo
          <input
            className="login-field mt-1 h-10 w-full rounded-lg border px-3 text-sm outline-none"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setAskPassword(false);
            }}
            autoComplete="username"
            placeholder="eduardo@weeon.school"
            required
          />
        </label>

        {askPassword ? (
          <div className="mt-4">
            <label htmlFor="password" className="block text-xs font-medium text-foreground/70">
              Contraseña
            </label>
            <PasswordInput
              id="password"
              wrapperClassName="mt-1"
              fieldClassName="login-field h-10 w-full rounded-lg border px-3 text-sm outline-none"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-error!">{error}</p> : null}

        <Button type="submit" className="brand-gradient mt-6 w-full border-0" disabled={pending}>
          {pending ? "Ingresando…" : askPassword ? "Entrar" : "Continuar"}
        </Button>

        <p className="mt-4 text-center text-sm text-white/55">
          <Link href="/forgot-password" className="transition-colors hover:text-white">
            ¿Olvidó su contraseña?
          </Link>
        </p>
      </form>
    </AmbientPage>
  );
}
