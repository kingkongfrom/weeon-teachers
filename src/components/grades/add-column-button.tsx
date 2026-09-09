"use client";

import { Loader2, Plus } from "lucide-react";

type AddColumnButtonProps = {
  adding: boolean;
  onClick: () => void;
  /** Icon-only circle (default) or labeled pill for the toolbar variant. */
  variant?: "icon" | "labeled";
  className?: string;
};

export function AddColumnButton({
  adding,
  onClick,
  variant = "icon",
  className = "",
}: AddColumnButtonProps) {
  if (variant === "labeled") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={adding}
        aria-label="Agregar evaluación"
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3.5 py-1.5 text-sm font-semibold text-success transition-colors hover:bg-success/20 disabled:opacity-60 ${className}`}
      >
        {adding ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        )}
        Agregar evaluación
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={adding}
      aria-label="Agregar evaluación"
      title="Agregar evaluación"
      className={`inline-flex rotate-45 cursor-pointer items-center justify-center rounded-full border border-success/40 bg-success/10 text-success transition-colors hover:bg-success/20 disabled:opacity-60 ${className}`}
      style={{ blockSize: 32, inlineSize: 32 }}
    >
      {adding ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4 -rotate-45" strokeWidth={3} />
      )}
    </button>
  );
}
