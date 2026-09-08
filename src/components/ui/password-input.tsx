"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  /** Base field class (e.g. your `login-field` utility). */
  fieldClassName?: string;
  /** Classes for the relative wrapper (spacing from the label, etc.). */
  wrapperClassName?: string;
};

/**
 * Password field with a show/hide eye toggle. Keeps the `type` internal so the
 * affordance stays consistent across the auth screens.
 */
export function PasswordInput({
  fieldClassName,
  wrapperClassName = "",
  id,
  ...props
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className={`relative ${wrapperClassName}`.trim()}>
      <input
        id={id}
        type={show ? "text" : "password"}
        className={`${fieldClassName ?? ""} pr-10`.trim()}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((p) => !p)}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={show}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/50 transition-colors hover:text-white"
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}
