"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type Option = { value: string; label: string };

type DropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  ariaLabel: string;
  placeholder?: string;
};

/** Styled dropdown (button + custom menu) so the menu corners can be rounded
 * and styled — the native <select> popup can't be. */
export function Dropdown({ value, onChange, options, ariaLabel, placeholder }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((was) => !was)}
        className="inline-flex h-9 w-full min-w-36 cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors hover:bg-surface-muted focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25"
      >
        <span className="truncate">
          {current?.label ?? placeholder ?? "Seleccionar"}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-foreground/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute z-30 mt-2 min-w-full rounded-xl border border-border bg-surface-elevated p-1 shadow-xl"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                    selected
                      ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                      : "text-foreground hover:bg-surface-muted"
                  }`}
                >
                  {option.label}
                  {selected ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
