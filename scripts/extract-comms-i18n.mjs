import fs from "node:fs";

const text = fs.readFileSync(
  new URL("../../weeon-tenants/lib/i18n/messages.ts", import.meta.url),
  "utf8",
);

function extractBlock(startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  if (start < 0) return "";
  const end = endMarker ? text.indexOf(endMarker, start + startMarker.length) : text.length;
  return text.slice(start, end >= 0 ? end : text.length);
}

function extractKeys(block) {
  const out = {};
  for (const m of block.matchAll(/"(comms\.[^"]+)":\s*"((?:\\.|[^"\\])*)"/g)) {
    out[m[1]] = m[2].replace(/\\n/g, "\n").replace(/\\"/g, '"');
  }
  return out;
}

const es = extractKeys(extractBlock("export const esMessages", "export const enMessages"));
const en = extractKeys(extractBlock("export const enMessages", "export type MessageKey"));

es["common.cancel"] = "Cancelar";
es["common.save"] = "Guardar";
en["common.cancel"] = "Cancel";
en["common.save"] = "Save";

const mergedEn = { ...es, ...en };
const out = `export type CommsMessageKey = keyof typeof commsEs;

export const commsEs = ${JSON.stringify(es, null, 2)} as const;

export const commsEn: Record<CommsMessageKey, string> = ${JSON.stringify(mergedEn, null, 2)};
`;

fs.writeFileSync(new URL("../src/lib/i18n/comms-messages.ts", import.meta.url), out);
console.log(`extracted ${Object.keys(es).length} es keys, ${Object.keys(en).length} en overrides`);
