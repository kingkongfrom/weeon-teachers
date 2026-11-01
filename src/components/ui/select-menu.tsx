"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterOption = {
  value: string;
  label: string;
  /** Optional right-aligned detail (a count, a peso, a level). */
  hint?: string;
  /** Optional glyph before the label. */
  icon?: React.ReactNode;
  /** Shown but not selectable, e.g. the "" placeholder while waiting for a choice. */
  disabled?: boolean;
};

/**
 * The app's popup listbox. Replaces `<select>` everywhere it matters:
 *
 * - A native select renders the OS menu, which ignores the app's typography,
 *   colours and corner radius — on Windows it is a grey Win32 popup, on iOS a
 *   wheel. In a product this considered that reads as unfinished.
 * - It also cannot show a hint, an icon or a selected tick.
 *
 * The list is a plain absolutely positioned sibling of the trigger, so it is
 * painted inside the same dialog and stacking context — no portal, no measured
 * geometry, nothing that can end up detached or off-screen. It flips above the
 * trigger when there is no room below (`up`).
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
  up = false,
  variant = "field",
  className,
  menuClassName,
  disabled = false,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Locks the trigger while a change is in flight. */
  disabled?: boolean;
  options: FilterOption[];
  /** Accessible name for the trigger. */
  label: string;
  placeholder?: string;
  align?: "left" | "right";
  /** Opens the list above the trigger — for triggers near the bottom of a sheet. */
  up?: boolean;
  /**
   * `field` fills its container (inside forms, matching inputs);
   * `pill` is the compact toolbar shape;
   * `chip` is the tiny in-row control used by dense editors (rubro kind).
   */
  variant?: "field" | "pill" | "chip";
  className?: string;
  /** Forces the list width (e.g. `w-52`); otherwise it matches the trigger. */
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
  const wrapperRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((state) => !state), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div
      ref={wrapperRef}
      // While open the whole control is lifted, so its listbox paints over
      // sibling rows, grid cells and any neighbouring control no matter what
      // z-index they carry. `close` resets it with the list.
      className={cn(
        "relative",
        variant !== "field" && "inline-flex",
        open && "z-[46]",
        className,
      )}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <Trigger
        open={open}
        onClick={toggle}
        label={label}
        variant={variant}
        isDefault={isDefault}
        disabled={disabled}
      >
        {current?.icon}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-left",
            variant === "field" && !current && "text-foreground/40",
            variant === "chip" && "text-[11px]",
          )}
        >
          {current?.label ?? placeholder ?? ""}
        </span>
        {children}
        <ChevronDown
          className={cn(
            "shrink-0 transition-transform duration-150",
            variant === "field" ? "h-4 w-4 text-foreground/40" : "h-3.5 w-3.5 opacity-55",
            variant === "chip" && "h-3 w-3",
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
            onClick={close}
            className="fixed inset-0 z-[45] cursor-default"
          />
          <ul
            role="listbox"
            aria-label={label}
            className={cn(
              "absolute z-[46] max-h-72 w-full min-w-full overflow-y-auto rounded-xl border border-border bg-surface-elevated p-1 shadow-[0_16px_40px_-12px_rgb(16_32_29/0.28)]",
              up ? "bottom-full mb-1.5" : "top-full mt-1.5",
              align === "right" ? "right-0" : "left-0",
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
                    disabled={option.disabled}
                    onClick={() => {
                      if (option.disabled) return;
                      onChange(option.value);
                      close();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                      option.disabled && "cursor-default text-foreground/35 hover:bg-transparent",
                      !option.disabled && selected
                        ? "bg-[#0891B2]/10 font-semibold text-[#0e7490] dark:text-[#22d3ee]"
                        : !option.disabled && "font-medium text-foreground/75 hover:bg-surface-muted",
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
  disabled,
  children,
}: {
  open: boolean;
  onClick: () => void;
  label: string;
  variant: "field" | "pill" | "chip";
  isDefault: boolean;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const shared = {
    type: "button" as const,
    "aria-haspopup": "listbox" as const,
    "aria-expanded": open,
    "aria-label": label,
    disabled,
    onClick,
  };

  if (variant === "field") {
    return (
      <button
        {...shared}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-[15px] font-semibold text-foreground",
          "transition-[border-color,box-shadow,background-color] duration-150",
          "hover:border-border-strong disabled:opacity-60",
          open && "border-[#0891B2] bg-surface shadow-[0_0_0_3px_rgb(8_145_178/0.14)]",
        )}
      >
        {children}
      </button>
    );
  }

  if (variant === "chip") {
    return (
      <button
        {...shared}
        className={cn(
          "inline-flex h-8 w-full min-w-0 items-center gap-1 rounded-lg border px-1.5 text-[11px] font-semibold transition-colors",
          "disabled:opacity-60",
          isDefault
            ? "border-border bg-background text-foreground/50 hover:text-foreground"
            : "border-[#0891B2]/35 bg-[#0891B2]/[0.07] text-[#0e7490] dark:text-[#22d3ee]",
          open && "border-[#0891B2]",
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
