import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/dev-with-env.mjs <env-file>");
  process.exit(1);
}

const text = readFileSync(resolve(file), "utf8");
const fromFile = {};
for (const line of text.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 0) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  fromFile[key] = value;
}

const previous = process.env.DB_NAME;
const env = { ...process.env, ...fromFile };
if (previous && previous !== env.DB_NAME) {
  console.log(`Overriding leftover DB_NAME ${previous} -> ${env.DB_NAME}`);
}
console.log(`Using ${file} -> ${env.DB_HOST}/${env.DB_NAME}`);

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev"], {
  stdio: "inherit",
  env,
});
child.on("exit", (code) => process.exit(code ?? 0));
