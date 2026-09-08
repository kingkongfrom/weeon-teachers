"use client";

import { motion } from "motion/react";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
};

export function Switch({ checked, onChange, label, id }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
        checked ? "bg-brand-600 border-brand-600" : "bg-surface-muted border-border"
      }`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={`absolute h-5 w-5 rounded-full bg-white shadow-sm ${
          checked ? "right-0.5" : "left-0.5"
        }`}
      />
    </button>
  );
}
