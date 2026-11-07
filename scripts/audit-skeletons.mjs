/**
 * Skeleton audit harness.
 *
 * Forces the loading UI to stay on screen by throttling the network, then
 * compares its SHAPE against the settled page.
 *
 * Why shape and not pixels: a skeleton's job is that the swap does not move the
 * page. So the numbers that matter are the height of the outer container and how
 * many top-level blocks it has. A mismatch of a whole block, or a container
 * hundreds of px taller than the real page, is the defect.
 */
import { chromium, devices } from "playwright";

const ROUTES = [
  "/inicio",
  "/agenda",
  "/agenda/calendario",
  "/horarios",
  "/aula-virtual",
  "/grupos",
  "/reportes",
  "/comunicacion",
  "/comunicacion/mensajes",
  "/comunicacion/correo",
  "/comunicacion/circulares",
  "/comunicacion/chat",
];

const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"],
  headless: true,
  hasTouch: true,
  isMobile: true,
});
const page = context.pages()[0] ?? await context.newPage();

async function signature() {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    const root = main?.firstElementChild;
    if (!root) return null;
    return {
      h: Math.round(root.getBoundingClientRect().height),
      blocks: root.children.length,
    };
  });
}

for (const route of ROUTES) {
  const url = `http://localhost:3001${route}`;
  const client = await context.newCDPSession(page);

  /* Skeleton: hold the document open so the streamed loading UI is what paints. */
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 2500,
    downloadThroughput: (56 * 1024) / 8,
    uploadThroughput: (56 * 1024) / 8,
  });
  await page.goto(url, { waitUntil: "commit" });
  await page.waitForTimeout(4200);
  const skel = await signature();

  /* Real page: unthrottle and settle. */
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await page.waitForTimeout(9000);
  const real = await signature();

  const flag =
    skel && real && (Math.abs(skel.h - real.h) > 60 || Math.abs(skel.blocks - real.blocks) >= 1)
      ? "  <-- MISMATCH"
      : "";
  console.log(
    `${route.padEnd(28)} skeleton ${String(skel?.h ?? "-").padStart(5)}px/${skel?.blocks ?? "-"} blocks   real ${String(real?.h ?? "-").padStart(5)}px/${real?.blocks ?? "-"} blocks${flag}`,
  );
  await client.detach();
}

await context.close();
