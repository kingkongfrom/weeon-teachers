#!/usr/bin/env node
/**
 * In-process type check for sandboxed machines.
 *
 * The `npm run typecheck` script runs `next typegen && tsc --noEmit`, both of
 * which spawn child processes. Where pipes are denied (see
 * docs/agent-verification-limits.md) that script cannot run at all. TypeScript's
 * own compiler API does not spawn anything, so this script drives it directly.
 *
 * It is NOT a replacement for `npm run typecheck`: it drives the selected
 * tsconfig's file list through the API and skips `next typegen` (so
 * `.next/types` route types are absent). It exists to catch real mistakes — a
 * wrong import, a mistyped property, an `it()` with the wrong arity — when the
 * real gate is unavailable.
 *
 * Usage (from the repo root):
 *   node scripts/typecheck-files.mjs                        # tsconfig.json files
 *   node scripts/typecheck-files.mjs --project tsconfig.tests.json
 *   node scripts/typecheck-files.mjs <file> [file...]       # specific files
 *
 * Exit code 1 on errors.
 */

import { createRequire } from "node:module";
import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const argv = process.argv.slice(2);
let projectPath = resolve(process.cwd(), "tsconfig.json");
const fileArgs = [];

for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === "--project") {
    projectPath = resolve(process.cwd(), argv[i + 1] ?? "tsconfig.json");
    i += 1;
  } else {
    fileArgs.push(argv[i]);
  }
}

if (!existsSync(projectPath)) {
  console.error(`No tsconfig at ${projectPath}`);
  process.exit(2);
}

const raw = ts.readConfigFile(projectPath, (p) => readFileSync(p, "utf8"));
if (raw.error) {
  console.error(ts.flattenDiagnosticMessageText(raw.error.messageText, "\n"));
  process.exit(2);
}

const parsed = ts.parseJsonConfigFileContent(
  raw.config,
  ts.sys,
  process.cwd(),
  undefined,
  projectPath,
);

const files =
  fileArgs.length > 0
    ? fileArgs.map((f) => resolve(process.cwd(), f)).filter((f) => existsSync(f))
    : parsed.fileNames;

if (files.length === 0) {
  console.error("No files matched.");
  process.exit(2);
}

const compilerOptions = { ...parsed.options, noEmit: true, incremental: false };
const host = ts.createCompilerHost(compilerOptions);
const program = ts.createProgram(files, compilerOptions, host);
const diagnostics = ts.getPreEmitDiagnostics(program);

const format = (d) => {
  const message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
  if (!d.file) return { where: "tsconfig", message };
  const { line, character } = d.file.getLineAndCharacterOfPosition(d.start ?? 0);
  const rel = d.file.fileName.replace(/\\/g, "/").replace(process.cwd().replace(/\\/g, "/") + "/", "");
  return { where: `${rel}:${line + 1}:${character + 1}`, message };
};

const errors = diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error);

console.log(
  `TypeScript ${ts.version} — project ${projectPath.replace(process.cwd() + "\\", "")}`,
);
console.log(`Checked ${files.length} file(s)\n`);

if (errors.length === 0) {
  console.log("No type errors.");
  process.exit(0);
}

console.log(`${errors.length} type error(s):`);
for (const d of errors) {
  const f = format(d);
  console.log(`  ${f.where}\n    ${f.message.replace(/\n/g, "\n    ")}`);
}
console.log(
  "\nReminder: this is a subset check. Run the real gate (`npm run typecheck`) before merging.",
);
process.exit(1);
