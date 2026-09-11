"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Home, ShieldAlert } from "lucide-react";
import { LogoCompact } from "@/components/brand/logo";
import { useLocale, useT } from "@/lib/i18n/client";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * 404 screen matching the admin: staggered Motion entrance (logo → eyebrow →
 * title → body → actions), the gradient wordmark, and the navy `not-found-bg`
 * field with brand blobs.
 */
export function NotFoundScreen() {
  const t = useT();
  const locale = useLocale();
  return (
    <main className="not-found-bg relative flex min-h-screen flex-1 flex-col">
      <div className="not-found-bg-blobs" aria-hidden>
        <span className="not-found-blob not-found-blob-purple" />
        <span className="not-found-blob not-found-blob-cyan" />
        <span className="not-found-blob not-found-blob-blue" />
      </div>
      <div className="not-found-bg-frost" aria-hidden />

      <div className="not-found-content mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-8 flex flex-col items-center text-3xl"
        >
          <LogoCompact />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
          className="not-found-eyebrow mt-[-2px] inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {t.notFound.eyebrow}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
          className="not-found-title brand-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
        >
          {t.notFound.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
          className="not-found-body mt-5 max-w-sm text-base leading-relaxed"
        >
          {t.notFound.body}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: EASE }}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link
            href="/inicio"
            className="brand-gradient group inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-95"
          >
            <Home className="h-4 w-4" />
            {t.notFound.goHome}
          </Link>
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-foreground/25 px-8 text-sm font-semibold text-foreground/80 transition-colors hover:bg-foreground/5"
          >
            <ShieldAlert className="h-4 w-4" />
            {t.notFound.viewHome}
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-10 text-sm text-foreground/40"
        >
          Weeon School · {locale.toUpperCase()}
        </motion.p>
      </div>
    </main>
  );
}
