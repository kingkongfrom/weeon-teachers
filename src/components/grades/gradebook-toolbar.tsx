"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveT } from "@/lib/i18n/client";

type SortBy = "name" | "finalDesc" | "finalAsc";

/**
 * Gradebook toolbar: search, sort, the two row filters, the marks view and the
 * phone cards/matrix switch, plus the grade-band legend.
 *
 * Pulled out of the workspace because the responsive sizing is fiddly (four
 * controls have to share one 390 px row) and it is worth being able to reason
 * about — and preview — on its own.
 */
export function GradebookToolbar({
  query,
  onQueryChange,
  sortBy,
  onSortChange,
  onlyPending,
  onTogglePending,
  onlyAtRisk,
  onToggleAtRisk,
  markView,
  onMarkViewChange,
  phoneView,
  onPhoneViewChange,
  passMark,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  sortBy: SortBy;
  onSortChange: (value: SortBy) => void;
  onlyPending: boolean;
  onTogglePending: () => void;
  onlyAtRisk: boolean;
  onToggleAtRisk: () => void;
  markView: "points" | "percent";
  onMarkViewChange: (value: "points" | "percent") => void;
  phoneView: "cards" | "grid";
  onPhoneViewChange: (value: "cards" | "grid") => void;
  passMark: number;
}) {
  const t = useLiveT();
  const w = t.gradebook.workspace;
  const sb = w.scoreboard;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
      {/* Phone: the search gets its own full-width row — it is the control
          teachers reach for most and it was the one being squeezed. From
          landscape up everything returns to one line. */}
      <label className="relative flex w-full min-w-0 items-center [@media(orientation:landscape)]:w-60 [@media(orientation:landscape)]:flex-none">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-foreground/40" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={w.search}
          className="h-10 w-full min-w-0 rounded-full border border-border bg-background pl-9 pr-3 text-[13px] text-foreground outline-none focus:border-brand-400 [@media(orientation:landscape)]:h-9 [@media(orientation:landscape)]:text-sm"
        />
      </label>

      <div className="flex min-w-0 items-center gap-1.5 [@media(orientation:landscape)]:gap-2 [@media(orientation:landscape)]:flex-wrap [@media(min-width:1024px)]:flex-wrap">
        <CompactSelect
          value={sortBy}
          onChange={(value) => onSortChange(value as SortBy)}
          ariaLabel={sb.sort}
          className="min-w-0 flex-1"
          options={[
            { value: "name", label: sb.sortName },
            { value: "finalDesc", label: sb.sortFinalDesc },
            { value: "finalAsc", label: sb.sortFinalAsc },
          ]}
        />
        <FilterChip active={onlyPending} onClick={onTogglePending}>
          {sb.onlyPending}
        </FilterChip>
        <FilterChip active={onlyAtRisk} onClick={onToggleAtRisk}>
          {sb.onlyAtRisk}
        </FilterChip>
      </div>

      <div className="flex items-center justify-between gap-2 [@media(orientation:landscape)]:gap-3 [@media(orientation:landscape)]:flex-wrap [@media(min-width:1024px)]:gap-3 [@media(min-width:1024px)]:flex-wrap">
        <div
          role="radiogroup"
          aria-label={sb.totalsHint}
          title={sb.totalsHint}
          className="inline-flex h-8 shrink-0 items-center rounded-full border border-border p-0.5 print-hide [@media(orientation:landscape)]:h-9"
        >
          {(["points", "percent"] as const).map((mode) => {
            const active = markView === mode;
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onMarkViewChange(mode)}
                className={cn(
                  "h-7 min-w-9 rounded-full px-2.5 text-[11px] font-bold uppercase tracking-wide tabular-nums transition-colors [@media(orientation:landscape)]:h-8 [@media(orientation:landscape)]:min-w-11 [@media(orientation:landscape)]:px-3 [@media(orientation:landscape)]:text-xs",
                  active
                    ? "bg-[#e6defb] text-[#4c1d95] dark:bg-[#241b45] dark:text-[#c4b5fd]"
                    : "text-foreground/55 hover:text-foreground",
                )}
              >
                {mode === "percent" ? sb.totalsPercent : sb.totalsPoints}
              </button>
            );
          })}
        </div>

        <div
          role="radiogroup"
          aria-label={sb.phoneView}
          className="inline-flex h-8 items-center rounded-full border border-border p-0.5 [@media(orientation:landscape)]:hidden"
        >
          {(["cards", "grid"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={phoneView === mode}
              onClick={() => onPhoneViewChange(mode)}
              className={cn(
                "h-7 min-w-9 rounded-full px-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors",
                phoneView === mode
                  ? "bg-[#e6defb] text-[#4c1d95] dark:bg-[#241b45] dark:text-[#c4b5fd]"
                  : "text-foreground/55 hover:text-foreground",
              )}
            >
              {mode === "cards" ? sb.cards : sb.grid}
            </button>
          ))}
        </div>

        {/* On a phone the numbers already sit on each card, so only the
            swatches remain; the full ranges wrapped onto a second line. */}
        <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold [@media(orientation:landscape)]:gap-3 [@media(orientation:landscape)]:text-xs">
          <span className="flex items-center gap-1 text-foreground/50">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#abe3dc] ring-1 ring-[#7dd3c7]" />
            <span className="hidden [@media(orientation:landscape)]:inline">≥ {passMark}%</span>
          </span>
          <span className="flex items-center gap-1 text-foreground/50">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#fdeecd] ring-1 ring-[#f5d88a]" />
            <span className="hidden [@media(orientation:landscape)]:inline">50–69%</span>
          </span>
          <span className="flex items-center gap-1 text-foreground/50">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#fbdee7] ring-1 ring-[#f0b8c8]" />
            <span className="hidden [@media(orientation:landscape)]:inline">&lt; 50%</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        // Compact on a phone so the search field, sort and two chips share one
        // row; roomier from landscape up.
        "h-8 shrink-0 whitespace-nowrap rounded-full border px-2.5 text-[11px] font-bold uppercase tracking-[0.04em] transition-colors",
        "[@media(orientation:landscape)]:h-9 [@media(orientation:landscape)]:px-3 [@media(orientation:landscape)]:text-xs [@media(orientation:landscape)]:tracking-wide",
        active
          ? "border-[#7c3aed] bg-[#e6defb] text-[#4c1d95] dark:border-[#b9a3f7] dark:bg-[#241b45] dark:text-[#c4b5fd]"
          : "border-border text-foreground/55 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Sort control sized to sit beside a search field and two chips. */
function CompactSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className={cn("relative shrink-0 [@media(orientation:portrait)]:min-w-0", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((state) => !state)}
        className="inline-flex h-8 min-w-0 w-full items-center justify-between gap-1 rounded-full border border-border px-3 text-[11px] font-bold uppercase tracking-[0.04em] text-foreground/60 transition-colors [@media(orientation:landscape)]:h-9 [@media(orientation:landscape)]:w-auto [@media(orientation:landscape)]:flex-none [@media(orientation:landscape)]:gap-1.5 [@media(orientation:landscape)]:px-3 [@media(orientation:landscape)]:text-xs [@media(orientation:landscape)]:tracking-wide"
      >
        <span className="truncate">{current?.label}</span>
        <svg
          aria-hidden
          className="h-3 w-3 shrink-0 opacity-60"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
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
            aria-label={ariaLabel}
            className="absolute left-0 top-full z-40 mt-1.5 w-56 rounded-xl border border-border bg-surface-elevated p-1 shadow-[0_12px_32px_-8px_rgb(16_32_29/0.24)]"
          >
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                    option.value === value
                      ? "bg-[#0891B2]/10 font-semibold text-[#0e7490] dark:text-[#22d3ee]"
                      : "font-medium text-foreground/75 hover:bg-surface-muted",
                  )}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
