"use client";

import { useId, type HTMLAttributes } from "react";

type LogoProps = HTMLAttributes<HTMLSpanElement>;

/**
 * Brand device: a small gradient smile arc under the double-e of "Weeon".
 * The gradient id must be unique per instance (duplicates resolve to the first
 * match in the document, which may live in a display:none subtree).
 */
function EeSmileArc({ className = "" }: { className?: string }) {
  const id = `weeon-ee-smile-${useId().replace(/:/g, "")}`;
  return (
    <svg
      className={`pointer-events-none absolute ${className}`}
      viewBox="0 0 100 26"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5e25cc" />
          <stop offset="1" stopColor="#2b59ff" />
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
  );
}

/** Compact gradient wordmark: "Weeon" with the smile arc + "School" and the
 * teacher-portal "TEACHERS" label beneath "School". */
export function LogoCompact({ className = "", ...props }: LogoProps) {
  return (
    <span
      className={`inline-flex select-none items-baseline whitespace-nowrap text-xl font-black tracking-tight text-foreground ${className}`}
      {...props}
    >
      <span className="relative">
        <span className="brand-text">Weeon</span>
        <EeSmileArc className="left-[27%] right-[35%] -bottom-[0.12em] h-[0.22em]" />
      </span>
      <span className="ml-1 inline-flex flex-col items-start">
        <span className="font-bold leading-none tracking-tight text-foreground">
          School
        </span>
        <span className="mt-[0.18em] text-[0.5em] font-semibold uppercase leading-none tracking-[0.16em] text-foreground/55">
          TEACHERS
        </span>
      </span>
    </span>
  );
}

/** Favicon-style mark: white "W" letter on the gradient tile. */
export function LogoMark({ className = "", ...props }: LogoProps) {
  const gradientId = `weeon-logo-mark-${useId().replace(/:/g, "")}`;
  return (
    <span className={`inline-flex h-8 w-8 shrink-0 ${className}`} {...props}>
      <svg viewBox="0 0 32 32" className="h-full w-full" role="img" aria-label="Weeon">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5e25cc" />
            <stop offset="1" stopColor="#2b59ff" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
        <path
          fill="#fff"
          d="M 22.808 12.124 L 20.215 21.124 L 17.297 21.124 L 15.97 15.851 C 15.882 15.499 15.832 15.115 15.82 14.699 L 15.768 14.699 C 15.727 15.156 15.668 15.529 15.592 15.816 L 14.168 21.124 L 11.285 21.124 L 8.745 12.124 L 11.575 12.124 L 12.814 17.995 C 12.873 18.271 12.917 18.605 12.946 18.997 L 12.999 18.997 C 13.028 18.587 13.081 18.241 13.157 17.96 L 14.704 12.124 L 17.35 12.124 L 18.738 17.995 C 18.773 18.142 18.814 18.482 18.861 19.015 L 18.923 19.015 C 18.952 18.675 18.999 18.335 19.063 17.995 L 20.232 12.124 Z"
        />
      </svg>
    </span>
  );
}
