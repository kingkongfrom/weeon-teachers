# Handover — Aula virtual: subject labels, speed, and how to measure it

*Session date: 28 October 2026. Repo: **`weeon-teachers`**. Status: **built,
uncommitted** (see § 9). Read `docs/aula-virtual.md` § Performance and
`AGENTS.md` first; this file is the narrative of *why* the current shape is what
it is, and what an agent must not undo.*

---

## 1. What was asked

1. A **translation under each subject pill** in the aula virtual ("Ciencias" /
   *Science*), smaller, 1 px tighter, flipping with the language switch.
2. **"Math" → "Mathematics".**
3. **Subject switching was too slow.** Make it fast, keep the URL sane.
4. **Language changes took very long** on some screens. Make them client-side.
5. **A way to measure performance** so we know what to improve — not opinions.

---

## 2. What is now on disk

| Area | Files | State |
| --- | --- | --- |
| Subject translation map | `src/lib/i18n/subject-names.ts` (+ `.test.ts`) | new |
| Two-line pills | `src/components/classroom/subject-switcher.tsx` | changed |
| Client-side subject switch | `subject-switcher.tsx`, `classwork-panel.tsx`, `class-tabs.tsx`, `exam-dates-panel.tsx` | changed |
| Tab-scoped loading | `src/app/(app)/aula-virtual/[classId]/page.tsx` | changed |
| Cheap badge | `src/lib/dashboard/justification-inbox.ts` (`loadJustificationCountForClass`) | changed |
| Batched signing | `src/lib/dashboard/justification-urls.ts` | new |
| Live locale everywhere | 79 `src/components/**` files (+ `lib/i18n/use-i18n.ts`) | changed |
| Performance harness | `src/lib/perf/nav-timing.ts`, `scripts/perf-aula.mjs`, `package.json` (`perf:aula`) | new |
| Docs | `docs/aula-virtual.md` (§ Loading skeletons note, *Materias* bullets, § Performance) | changed |

Everything above is **uncommitted** in the working tree except the pre-existing
`1506d87` / `79b592a` commits on `main`, which this work builds on.

---

## 3. Subject labels

`src/lib/i18n/subject-names.ts` is a **name map**, not a message catalog:

- `subjectNameForLocale(name, locale)` — display name in the UI language. Also
  resolves a stored **English** name back to its entry ("Science" → Ciencias).
- `subjectTranslationForLocale(name, locale)` — the *other* language's name, or
  `null` when there is nothing to add (unknown subject, or the two languages
  spell it the same). Used for the second line.
- `isTranslatedSubjectName(name)` — true for any known subject in either
  language; used by the assessment auto-title logic.

UI rules:

- Pill = flex column, primary line 13 px, second line **9.5 px, `mt-px`,
  55 % opacity**, `whitespace-nowrap`.
- The second line **reserves its height even when empty** (`invisible`, `\u00a0`)
  so pills of mixed knowledge still line up.
- Single-subject chip (class has one materia) shows the same pair at 11/9 px.
- EN is **Mathematics**, not "Math". Applied Math stays.
- The second line is decided by `subjectTranslationForLocale`: it is `null`
  when the subject is unknown **or when both languages resolve to the same
  text**. Geografía/Geography share an entry but differ by accent, so a
  Spanish session still shows the English line for that subject — that is
  accepted, not a bug.

**Do not** move subject names into `messages.ts`. The map is imported by the
editor, previews, exam dates, the library and the switcher.

---

## 4. Why subject switching was slow, and the fix

Before:

1. Every pill was a `<Link href>` → a **full server render** of the class page.
2. That page awaited **eight** loaders regardless of tab: materials,
   assessments, turn-ins, attendance, exam dates, lesson days, the whole
   school-wide justification inbox (only to count one badge), school row.
3. `loading.tsx` replaced the screen with a skeleton — including the **old hero
   card**, so it looked like an old build.
4. Several of those loaders sign storage URLs **one row at a time**.

After:

- Pills are `<button>`s: `onSubjectChange(id)` (local state, instant) **then**
  `router.replace(..., { scroll: false })` for the URL. The URL never gates the
  paint.
- `ClassworkPanel` and `ExamDatesPanel` receive the **full, unfiltered** lists
  once and filter in the client.
- The page loads **only the active tab's** loaders, in one `Promise.all`
  (`loadTeacherGrupo`/session run in parallel with them).
- Badge = `loadJustificationCountForClass` (`head: true`), not the inbox.
- Attachments are signed with one `createSignedUrls` call.

**Trap we hit twice (do not repeat):** `Promise.all([a ? loadA() : Promise.resolve([]), …])`
where `loadA` returns `AssessmentSummary[]` and the other branch returns `never[]`
— TS infers a union and a `null`/function leaked through at runtime
(`materials.filter is not a function`). The branches are now cast to
`Awaited<ReturnType<typeof loadX>>` and `rawAssessments` is guarded with
`Array.isArray`.

**Second trap:** a custom `cacheOutsideRender` wrapper (`AsyncLocalStorage` +
`cache()`) was tried to dedupe loaders outside a render. It broke the loaders
(it returned the wrapper instead of data in the RSC path) and was **reverted and
deleted**. All loaders are back on React's `cache()`. If someone revisits that
idea, prove it with a test that calls the loader twice and asserts the *value*.

---

## 5. Why language switching was slow

Most components used `useT()` / `useLocale()` from `@/lib/i18n/client`, which
read the **locale value baked into the server tree**. The switch writes the
cookie + `hotLocale` and emits to `useSyncExternalStore` subscribers, so only
components using `useLiveT` / `useLiveLocale` repainted immediately — the rest
waited for `router.refresh()`.

Now: every component under `src/components/**` uses the live hooks (79 files
migrated), and Comunicación's flat translator (`lib/i18n/use-i18n.ts`) also
reads the live locale and exports `useLiveT` as an alias.

**What is still slow by design:** server-rendered page copy (`getT()` in a
server component). That cannot repaint without the refresh. Keep *interactive*
chrome on the live hooks; keep *document* copy on the server.

---

## 6. The measurement harness

`src/lib/perf/nav-timing.ts` + `scripts/perf-aula.mjs` (`npm run perf:aula`).
Full usage in `docs/aula-virtual.md` § Performance. Summary:

- Measures `weeon:{subject|tab}:{active|content}` with `performance.measure`.
- `window.weeonPerf.summary() | table() | reset()` in the browser (installed
  lazily on the first measured click — no extra component mounted).
- DevTools → Performance → Timings track for a timeline view.
- `npm run perf:aula -- --url …` for repeatable numbers + **RSC requests per
  switch** (the tell for "did this regress to a server round trip?").
- Production INP/LCP via `@vercel/speed-insights` is **planned, not built**.

Overhead: microseconds per click, no network, no render, pruned after 30 s,
no-op in production unless `NEXT_PUBLIC_PERF_INSTRUMENTATION=1`. It does not
meaningfully affect the numbers it records.

Budgets: subject → active < 50 ms, subject → content < 100 ms with 0 blocking
RSC fetches, first paint < 1.5 s warm.

---

## 7. Open item — the "old header" report

The class page lost its hero card in `1506d87`. The user still saw old chrome.
Cause candidates, in order:

1. **`src/app/(app)/aula-virtual/[classId]/loading.tsx` was never updated** —
   it still renders `BackLinkSkeleton` + `AulaClassHeroSkeleton` +
   `ClassTabsBarSkeleton`, i.e. the pre-rebuild chrome, on every server render.
   **This is the most likely cause and is still unfixed.**
2. A stale dev server / stale `.next` chunks (restart `next dev`).
3. Looking at another branch (`feat/gradebook-marketing-look` does not contain
   `1506d87`).

**Next agent: rewrite `loading.tsx` to mirror `ClassHeader`** (one 56 px row +
tab pill row), then delete the unused `AulaClassHeroSkeleton` usages if nothing
else needs them.

---

## 8. What not to do

- Do not restore `<Link href>` on subject pills or load lists on every subject
  change.
- Do not await the whole school-wide justification inbox on a class page.
- Do not sign storage URLs per row on a hot path.
- Do not put subject names in the message catalog.
- Do not replace `cache()` with a custom wrapper without a value-level test.
- Do not use `useT`/`useLocale` in client components (only `getT()` on the
  server).
- Do not reintroduce `serverExternalPackages`-style tricks on these loaders.

---

## 9. Release state

Working tree in `weeon-teachers` contains this work **plus earlier uncommitted
work not from this session** (`assessment-editor.tsx`, `assessment-preview.tsx`,
`submission-grader.tsx`, `teacher-morning.tsx`, `install-prompt.tsx`,
`assessments-actions.ts`, `messages.ts`, `lib/assessments/title.ts`). Suggested
commit split for this session's slice:

1. `feat(aula-virtual): bilingual subject labels` — `subject-names.ts` +
   test + `subject-switcher.tsx`.
2. `perf(aula-virtual): subject switch without a server render` —
   `classwork-panel.tsx`, `class-tabs.tsx`, `exam-dates-panel.tsx`,
   `[classId]/page.tsx`, `justification-inbox.ts`, `justification-urls.ts`.
3. `perf(i18n): live locale for every client component` — the 79 component
   files + `use-i18n.ts`.
4. `feat(perf): navigation timing harness` — `lib/perf/`, `scripts/perf-aula.mjs`,
   `package.json`, docs.

Checks before any commit: `npx tsc --noEmit`, `npx eslint <changed>`,
`npm test`, then `npm run perf:aula` for a baseline.

Other repos have **unrelated** uncommitted work (`weeon-tenants` incl. an
unapplied migration `20261026200000_student_subject_teacher.sql`,
`weeon-mobile`, `weeon-management`). Do not sweep them into these commits.

---

## 10. Suggested next steps

1. Fix `loading.tsx` (§ 7).
2. Add the regression guards listed in `docs/aula-virtual.md` § Performance.
3. Record a `perf:aula` baseline and put the numbers in the PR description.
4. Wire `@vercel/speed-insights` in `weeon-teachers` for real-user INP.
5. Re-measure after any change to `[classId]/page.tsx` or the loaders.
