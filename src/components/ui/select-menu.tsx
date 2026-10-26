"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterOption = {
  value: string;
  label: string;
  /** Optional right-aligned detail (a count, a peso, a level). */
  hint?: string;
  /** Optional glyph before the label. */
  icon?: React.ReactNode;
};

/**
 * The app's popup listbox. Replaces `<select>` everywhere it matters:
 *
 * - A native select renders the OS menu, which ignores the app's typography,
 *   colours and corner radius — on Windows it is a grey Win32 popup, on iOS a
 *   wheel. In a product this considered that reads as unfinished.
 * - It also cannot show a hint, an icon or a selected tick.
 *
 * Accessible by construction: `role="listbox"`, `aria-selected`, Escape and
 * outside-click close, focus stays on the trigger.
 */
export function SelectMenu({
  value,
  onChange,
  options,
  label,
  placeholder,
  align = "left",
  variant = "field",
  className,
  menuClassName,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  /** Accessible name for the trigger. */
  label: string;
  placeholder?: string;
  align?: "left" | "right";
  /**
   * `field` fills its container (inside forms, matching inputs);
   * `pill` is the compact toolbar shape.
   */
  variant?: "field" | "pill";
  className?: string;
  menuClassName?: string;
  /** Extra content inside the trigger, after the label (e.g. a hint). */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const current = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );
  const isDefault = options[0]?.value === value;

  return (
    <div className={cn(variant === "field" ? "relative" : "", className)}>
      <Trigger
        open={open}
        onClick={() => setOpen((state) => !state)}
        label={label}
        variant={variant}
        isDefault={isDefault}
      >
        {current?.icon}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-left",
            variant === "field" && !current && "text-foreground/40",
          )}
        >
          {current?.label ?? placeholder ?? ""}
        </span>
        {children}
        <ChevronDown
          className={cn(
            "shrink-0 transition-transform duration-150",
            variant === "field" ? "h-4 w-4 text-foreground/40" : "h-3.5 w-3.5 opacity-55",
            open && "rotate-180",
          )}
        />
      </Trigger>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <ul
            role="listbox"
            aria-label={label}
            className={cn(
              "absolute z-40 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-border bg-surface-elevated p-1 shadow-[0_16px_40px_-12px_rgb(16_32_29/0.28)]",
              align === "right" ? "right-0" : "left-0",
              variant === "field" ? "left-0 right-0 min-w-full" : "w-max min-w-full max-w-[16rem]",
              menuClassName,
            )}
          >
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                      selected
                        ? "bg-[#0891B2]/10 font-semibold text-[#0e7490] dark:text-[#22d3ee]"
                        : "font-medium text-foreground/75 hover:bg-surface-muted",
                    )}
                  >
                    {option.icon ? (
                      <span className="shrink-0 text-foreground/45">{option.icon}</span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.hint ? (
                      <span className="shrink-0 text-[11px] font-medium tabular-nums text-foreground/40">
                        {option.hint}
                      </span>
                    ) : null}
                    {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function Trigger({
  open,
  onClick,
  label,
  variant,
  isDefault,
  children,
}: {
  open: boolean;
  onClick: () => void;
  label: string;
  variant: "field" | "pill";
  isDefault: boolean;
  children: React.ReactNode;
}) {
  const shared = {
    type: "button" as const,
    "aria-haspopup": "listbox" as const,
    "aria-expanded": open,
    "aria-label": label,
    onClick,
  };

  if (variant === "field") {
    return (
      <button
        {...shared}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-[15px] font-semibold text-foreground",
          "transition-[border-color,box-shadow,background-color] duration-150",
          "hover:border-border-strong",
          open && "border-[#0891B2] bg-surface shadow-[0_0_0_3px_rgb(8_145_178/0.14)]",
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      {...shared}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
        isDefault
          ? "border-border text-foreground/65 hover:bg-surface-muted hover:text-foreground"
          : "border-[#0891B2]/35 bg-[#0891B2]/[0.07] text-[#0e7490] dark:text-[#22d3ee]",
      )}
    >
      {children}
    </button>
  );
}
