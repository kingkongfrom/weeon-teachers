/**
 * Perceived-latency harness for the aula virtual (see `src/lib/perf/nav-timing.ts`).
 *
 * What the app records
 * --------------------
 * Every subject-pill click and every tab click drops `performance.measure()`
 * entries on the page:
 *
 *   weeon:subject:active   click → the clicked pill is the active one
 *   weeon:subject:content  click → the filtered lists are painted
 *   weeon:tab:active       click → the tab pill is active
 *   weeon:tab:content      click → that tab's panel is painted
 *
 * So there are three ways to read them:
 *
 * 1. **In the browser (fastest).** Open the class page, click between subjects
 *    ~10 times, then in the console:
 *
 *      window.weeonPerf.summary()
 *      // { subject: { active: {n, median, p90, max}, content: {...} }, tab: {...} }
 *      window.weeonPerf.table()   // the raw entries, newest first
 *      window.weeonPerf.reset()   // start a fresh sample
 *
 *    Or DevTools → Performance → record → User timing track, which shows each
 *    measure on the timeline next to the network waterfall.
 *
 * 2. **Automated (this script).** Repeatable numbers without a human:
 *
 *      npm run perf:aula -- --url "http://localhost:3000/aula-virtual/<classId>" \
 *                          --clicks 12 --headed
 *
 *    It signs in with `PERF_EMAIL` / `PERF_PASSWORD` (or uses a saved storage
 *    state via `--storage`), clicks subject pills in rotation, and prints the
 *    median / p90 / max for `active` and `content`, plus the network cost
 *    (RSC requests and total transfer) per switch.
 *
 * 3. **Server cost.** The `?_rsc=` count per click tells you whether a switch
 *    still reaches the server at all: an instant, client-side switch should be
 *    0 for the content phase (the URL sync may issue one, but it must not gate
 *    the paint).
 *
 * Usage notes
 * -----------
 * - Install once: `npm i -D playwright && npx playwright install chromium`.
 * - Dev server must already be running (`npm run dev`).
 * - Use `--headed` to watch it; `--json` to get machine-readable output.
 */
import { chromium } from "playwright";

/**
 * @typedef {{
 *   url: string,
 *   clicks: number,
 *   headed: boolean,
 *   json: boolean,
 *   storage: string | null,
 *   out: string | null,
 * }} Args
 */

function parseArgs(argv) {
  /** @type {Args} */
  const args = { url: "", clicks: 10, headed: false, json: false, storage: null, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = () => argv[++i];
    if (flag === "--url") args.url = next() ?? "";
    else if (flag === "--clicks") args.clicks = Number(next() ?? 10) || 10;
    else if (flag === "--headed") args.headed = true;
    else if (flag === "--json") args.json = true;
    else if (flag === "--storage") args.storage = next() ?? null;
    else if (flag === "--out") args.out = next() ?? null;
  }
  return args;
}

function stats(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return {
    n: sorted.length,
    median: round(at(0.5)),
    p90: round(at(0.9)),
    max: round(sorted[sorted.length - 1]),
  };
}

function round(value) {
  return Math.round(value * 10) / 10;
}

async function signIn(page, base) {
  const email = process.env.PERF_EMAIL;
  const password = process.env.PERF_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Set PERF_EMAIL and PERF_PASSWORD, or pass --storage <path to saved storage state>.",
    );
  }
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.fill("#username", email);
  await page.click('button[type="submit"]');
  // First password (pending_first_login) asks for a new one once; an active
  // account asks for the existing one. Try both flows, then land on /inicio.
  const passwordField = page.locator('input[type="password"]').first();
  await passwordField.waitFor({ timeout: 15_000 });
  await passwordField.fill(password);
  await page.click('button[type="submit"]');
  await page
    .waitForURL((url) => !url.pathname.startsWith("/crear-contrasena"), { timeout: 15_000 })
    .catch(() => {});
  await page.waitForLoadState("networkidle");
}

async function run(args, browser) {
  const context = await browser.newContext({
    storageState: args.storage ?? undefined,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  /** @type {{ url: string, ms: number }[]} */
  const rscRequests = [];
  /** @type {{ url: string, started: number } | null} */
  let currentRsc = null;
  page.on("request", (request) => {
    if (request.url().includes("_rsc=")) currentRsc = { url: request.url(), started: Date.now() };
  });
  page.on("requestfinished", (request) => {
    if (currentRsc && request.url() === currentRsc.url) {
      rscRequests.push({ url: currentRsc.url, ms: Date.now() - currentRsc.started });
      currentRsc = null;
    }
  });

  const base = new URL(args.url).origin;
  if (!args.storage) await signIn(page, base);

  await page.goto(args.url, { waitUntil: "networkidle" });
  await page.waitForSelector('[role="tablist"]');

  const pills = page.locator('[role="tablist"] a[role="tab"], [role="tablist"] button[role="tab"]');
  const count = await pills.count();
  if (count < 2) throw new Error("Need at least two subject pills on the page.");

  await page.evaluate(() => window.weeonPerf?.reset());

  for (let i = 0; i < args.clicks; i += 1) {
    const target = pills.nth(i % count);
    await target.click();
    // Let the click's own render + the background URL sync settle between runs.
    await page.waitForTimeout(150);
  }

  const raw = await page.evaluate(() =>
    performance
      .getEntriesByType("measure")
      .filter((entry) => entry.name.startsWith("weeon:"))
      .map((entry) => ({ name: entry.name, duration: entry.duration })),
  );

  const values = (name) =>
    raw.filter((entry) => entry.name === name).map((entry) => entry.duration);

  const rscMs = rscRequests.map((entry) => entry.ms);

  const report = {
    url: args.url,
    clicks: args.clicks,
    subject: {
      active: stats(values("weeon:subject:active")),
      content: stats(values("weeon:subject:content")),
    },
    tab: {
      active: stats(values("weeon:tab:active")),
      content: stats(values("weeon:tab:content")),
    },
    network: {
      rscRequests: rscRequests.length,
      perClick: round(rscRequests.length / Math.max(1, args.clicks)),
      rscMs: stats(rscMs),
    },
  };

  if (args.out) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(args.out, JSON.stringify({ report, raw }, null, 2));
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\nAula virtual — perceived latency (${args.clicks} switches)\n`);
    console.table({
      "subject → active": report.subject.active,
      "subject → content": report.subject.content,
      "tab → active": report.tab.active,
      "tab → content": report.tab.content,
    });
    console.log("RSC requests per switch:", report.network.perClick, "(ms:", report.network.rscMs, ")");
    console.log(
      "\nBudget: a subject switch should stay under ~50 ms to content and request 0–1 RSC fetches.\n",
    );
  }

  await context.close();
  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url) {
    console.error('Usage: npm run perf:aula -- --url "http://localhost:3000/aula-virtual/<classId>"');
    process.exit(1);
  }
  const browser = await chromium.launch({ headless: !args.headed });
  try {
    await run(args, browser);
  } finally {
    await browser.close();
  }
}

void main();
