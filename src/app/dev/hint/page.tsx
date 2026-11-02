"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Scratch preview of the portrait-phone "Tabla" hint. Local-only: open
 * /dev/hint, rotate the phone (or resize the window) to compare variants, then
 * delete this route once one is chosen and move it into the gradebook.
 */

const CYCLE = {
  duration: 2.6,
  ease: "easeInOut" as const,
  times: [0, 0.12, 0.48, 1],
  repeat: Infinity,
  repeatDelay: 0.8,
};

const BRAND_RING =
  "[background:linear-gradient(#f4f0fe,#f4f0fe)_padding-box,linear-gradient(135deg,#5e25cc,#2b59ff)_border-box] dark:[background:linear-gradient(#141416,#141416)_padding-box,linear-gradient(135deg,#5e25cc,#2b59ff)_border-box]";

function SpinBody({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="relative grid place-items-center"
      initial={{ rotate: 0 }}
      animate={{ rotate: [0, 0, 90, 90] }}
      transition={CYCLE}
    >
      {children}
    </motion.div>
  );
}

/** A: the dark chip the teacher built up to, 128 px, white phone. */
function VariantChip() {
  return (
    <SpinBody>
      <div className="grid h-32 w-32 place-items-center rounded-[2.25rem] bg-[#141416] text-white shadow-[0_18px_40px_-12px_rgb(20_20_22/0.55)]">
        <Smartphone className="h-16 w-16" strokeWidth={1.25} />
      </div>
    </SpinBody>
  );
}

/** B: no chip, one big outline icon. */
function VariantPlain() {
  return (
    <SpinBody>
      <Smartphone
        className="h-28 w-28 text-[#141416] dark:text-white"
        strokeWidth={1}
      />
    </SpinBody>
  );
}

/** C: chip in the brand gradient, soft and modern. */
function VariantGradientChip() {
  return (
    <SpinBody>
      <div className="grid h-32 w-32 place-items-center rounded-[2.25rem] bg-gradient-to-br from-[#5e25cc] to-[#2b59ff] text-white shadow-[0_20px_45px_-14px_rgb(94_37_204/0.6)]">
        <Smartphone className="h-16 w-16" strokeWidth={1.25} />
      </div>
    </SpinBody>
  );
}

/** D: outline chip with a brand-gradient border, icon in brand. */
function VariantOutlineChip() {
  return (
    <SpinBody>
      <div
        className={cn(
          "grid h-32 w-32 place-items-center rounded-[2.25rem] border-[1.5px] border-transparent text-[#4c1d95] dark:text-[#c4b5fd]",
          BRAND_RING,
        )}
      >
        <Smartphone className="h-16 w-16" strokeWidth={1.25} />
      </div>
    </SpinBody>
  );
}

/** E: two-finger rotate — hands arc around the phone, drawn once per cycle. */
function VariantHands() {
  return (
    <div className="relative grid h-40 w-40 place-items-center">
      {[0, 1].map((index) => (
        <motion.span
          key={index}
          aria-hidden
          className={cn(
            "absolute h-40 w-40 rounded-full border-[2.5px] border-transparent",
            BRAND_RING,
          )}
          style={{
            clipPath:
              index === 0
                ? "polygon(0 0, 100% 0, 100% 45%, 0 45%)"
                : "polygon(0 55%, 100% 55%, 100% 100%, 0 100%)",
          }}
          initial={{ rotate: index === 0 ? 0 : 180, opacity: 0 }}
          animate={{
            rotate: index === 0 ? [0, 45, 45] : [180, 225, 225],
            opacity: [0, 1, 0],
          }}
          transition={{ ...CYCLE, times: [0, 0.55, 1] }}
        />
      ))}
      <SpinBody>
        <Smartphone className="h-24 w-24 text-[#141416] dark:text-white" strokeWidth={1.1} />
      </SpinBody>
    </div>
  );
}

/** F: chip + one short line, readable at a glance. */
function VariantChipWithLine() {
  return (
    <div className="flex flex-col items-center gap-5">
      <VariantChip />
      <p className="text-sm font-semibold text-foreground/70">
        Gira tu teléfono para ver la tabla
      </p>
    </div>
  );
}

/** G: soft tile (surface-muted), dark icon — closest to a system empty state. */
function VariantSoftTile() {
  return (
    <SpinBody>
      <div className="grid h-32 w-32 place-items-center rounded-[2.25rem] bg-surface-muted text-foreground/70 ring-1 ring-border">
        <Smartphone className="h-16 w-16" strokeWidth={1.25} />
      </div>
    </SpinBody>
  );
}

const VARIANTS: { key: string; name: string; note: string; render: () => React.ReactNode }[] = [
  { key: "A", name: "Chip negro", note: "La versión que armaste, a 128 px.", render: () => <VariantChip /> },
  { key: "B", name: "Icono grande sin chip", note: "Solo el contorno, sin superficie.", render: () => <VariantPlain /> },
  { key: "C", name: "Chip con degradado", note: "Marca Weeon, sombra púrpura.", render: () => <VariantGradientChip /> },
  { key: "D", name: "Chip con borde degradado", note: "Fondo suave, borde de la marca.", render: () => <VariantOutlineChip /> },
  { key: "E", name: "Dos dedos girando", note: "Arcos alrededor del teléfono.", render: () => <VariantHands /> },
  { key: "F", name: "Chip + una línea", note: "Explica en palabras.", render: () => <VariantChipWithLine /> },
  { key: "G", name: "Azulejo suave", note: "Empty state del sistema.", render: () => <VariantSoftTile /> },
];

export default function HintPreviewPage() {
  const [only, setOnly] = useState<string | null>(null);
  const shown = only ? VARIANTS.filter((variant) => variant.key === only) : VARIANTS;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-foreground">Rotate hint — preview</h1>
        <p className="text-sm text-foreground/60">
          Rota el teléfono de lado para ver la variante en horizontal. Ruta temporal:
          se borra cuando elijas.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOnly(null)}
            className={cn(
              "h-8 rounded-full border px-3 text-xs font-bold uppercase",
              only == null ? "border-brand-600 bg-brand-600 text-white" : "border-border text-foreground/60",
            )}
          >
            Todas
          </button>
          {VARIANTS.map((variant) => (
            <button
              key={variant.key}
              type="button"
              onClick={() => setOnly(variant.key)}
              className={cn(
                "h-8 rounded-full border px-3 text-xs font-bold uppercase",
                only === variant.key
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-border text-foreground/60",
              )}
            >
              {variant.key}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((variant) => (
          <section
            key={variant.key}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-foreground/50">
              {variant.key} · {variant.name}
            </p>
            <div className="grid min-h-56 place-items-center rounded-xl bg-surface-muted/40">
              {variant.render()}
            </div>
            <p className="text-xs font-medium text-foreground/55">{variant.note}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
