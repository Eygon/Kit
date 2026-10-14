import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const ENTRY_BUDGET_BYTES = 450_000;
export const INITIAL_JS_BUDGET_BYTES = 900_000;

const FONT_EXTENSIONS = [".woff", ".woff2", ".ttf", ".otf"];
const ALLOWED_FONT_SUBSETS = ["-latin-", "-latin-ext-"];
const BYTES_PER_KILOBYTE = 1000;

const listAssets = (assetsDir) => (existsSync(assetsDir) ? readdirSync(assetsDir) : []);

const collectInitialFiles = (manifest, key, visited = new Set()) => {
  if (visited.has(key) || !manifest[key]) return visited;
  visited.add(key);
  for (const imported of manifest[key].imports ?? []) collectInitialFiles(manifest, imported, visited);
  return visited;
};

const findFontViolations = (assetsDir) =>
  listAssets(assetsDir)
    .filter((name) => FONT_EXTENSIONS.some((extension) => name.endsWith(extension)))
    .filter((name) => !ALLOWED_FONT_SUBSETS.some((subset) => name.includes(subset)))
    .map((name) => `Font outside the latin and latin-ext subsets: assets/${name}`);

const findInlineFontViolations = (assetsDir) =>
  listAssets(assetsDir)
    .filter((name) => name.endsWith(".css"))
    .filter((name) => readFileSync(path.join(assetsDir, name), "utf8").includes("data:font"))
    .map((name) => `Stylesheet with an inline font (data:font): assets/${name}`);

export const checkBundle = (distDir) => {
  const manifestPath = path.join(distDir, ".vite", "manifest.json");
  if (!existsSync(manifestPath)) {
    return {
      entryFile: "",
      entryBytes: 0,
      initialJsBytes: 0,
      violations: [`Manifest not found at ${manifestPath}: lancez npm run build d'abord`],
    };
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
  const sizeOf = (key) => statSync(path.join(distDir, manifest[key].file)).size;
  const entryBytes = sizeOf(entryKey);
  const initialJsBytes = [...collectInitialFiles(manifest, entryKey)].reduce((total, key) => total + sizeOf(key), 0);
  const entryFile = manifest[entryKey].file;
  const assetsDir = path.join(distDir, "assets");
  const violations = [];

  if (entryBytes > ENTRY_BUDGET_BYTES) {
    violations.push(`Entry ${entryFile} is ${entryBytes} bytes, over the budget of ${ENTRY_BUDGET_BYTES} bytes`);
  }
  if (initialJsBytes > INITIAL_JS_BUDGET_BYTES) {
    violations.push(`Initial JS is ${initialJsBytes} bytes, over the budget of ${INITIAL_JS_BUDGET_BYTES} bytes`);
  }

  return {
    entryFile,
    entryBytes,
    initialJsBytes,
    violations: [...violations, ...findFontViolations(assetsDir), ...findInlineFontViolations(assetsDir)],
  };
};

const formatKilobytes = (bytes) => `${(bytes / BYTES_PER_KILOBYTE).toFixed(1)} kB`;

const runCli = () => {
  const distDir = process.argv[2] ?? "dist";
  const { entryFile, entryBytes, initialJsBytes, violations } = checkBundle(distDir);

  if (entryFile) {
    process.stdout.write(`Entry ${entryFile}: ${formatKilobytes(entryBytes)} (budget ${formatKilobytes(ENTRY_BUDGET_BYTES)})\n`);
    process.stdout.write(
      `Initial JS: ${formatKilobytes(initialJsBytes)} (budget ${formatKilobytes(INITIAL_JS_BUDGET_BYTES)})\n`,
    );
  }
  for (const violation of violations) process.stderr.write(`${violation}\n`);
  if (violations.length > 0) process.exitCode = 1;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runCli();
