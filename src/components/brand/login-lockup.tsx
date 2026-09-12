import { useId, type HTMLAttributes } from "react";

type LoginLockupProps = HTMLAttributes<HTMLSpanElement> & {
  /** "Weeon" type size. */
  size?: "md" | "lg";
  /** Secondary label, e.g. "School". */
  secondary?: string;
};

const SIZES = {
  md: { weeon: "text-2xl", secondary: "text-xl" },
  lg: { weeon: "text-4xl", secondary: "text-3xl" },
} as const;

/**
 * Original brand lockup for the auth screens: Bricolage Grotesque display type,
 * gradient "Weeon" + the small smile arc + light secondary label. Sits on the
 * navy ambient field, so text defaults white via `.login-bg .login-lockup`.
 */
export function LoginLockup({
  size = "md",
  secondary = "School",
  className = "",
  ...props
}: LoginLockupProps) {
  const id = `weeon-login-smile-${useId().replace(/:/g, "")}`;
  const s = SIZES[size];

  return (
    <span
      className={`login-lockup inline-flex select-none items-baseline gap-1.5 tracking-tight ${className}`}
      {...props}
    >
      <span className={`${s.weeon} brand-display relative inline-block leading-none`}>
        <span className="brand-text">Weeon</span>
        <svg
          aria-hidden
          className="pointer-events-none absolute left-[27%] right-[35%] -bottom-[0.12em] h-[0.22em]"
          viewBox="0 0 100 26"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" style={{ stopColor: "var(--brand-start)" }} />
              <stop offset="0.42" style={{ stopColor: "var(--brand-mid)" }} />
              <stop offset="1" style={{ stopColor: "var(--brand-end)" }} />
            </linearGradient>
          </defs>
          <path
            d="M 8 4 Q 50 34 92 4"
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth="9"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span
        className={`inline-flex flex-col items-start ${s.secondary} font-medium leading-none`}
      >
        <span className="login-school">{secondary}</span>
        <span className="mt-[0.16em] text-[0.4em] font-semibold uppercase tracking-[0.16em] opacity-75">
          TEACHERS
        </span>
      </span>
    </span>
  );
}
