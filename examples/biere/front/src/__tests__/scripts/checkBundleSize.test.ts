import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { ENTRY_BUDGET_BYTES, INITIAL_JS_BUDGET_BYTES, checkBundle } from "../../../scripts/check-bundle-size.mjs";

type ManifestEntry = Readonly<{ file: string; isEntry?: boolean; imports?: string[]; dynamicImports?: string[] }>;
type Fixture = Readonly<{ manifest?: Record<string, ManifestEntry>; files: Record<string, number | string> }>;

const SCRIPT_PATH = path.resolve(process.cwd(), "scripts/check-bundle-size.mjs");
const KILOBYTE = 1000;

// Dependency names of the project before the bundle guard (base a3317e9): the guard must add none.
const BASE_DEPENDENCIES = [
  "@fontsource/plus-jakarta-sans",
  "@fontsource/shrikhand",
  "@gravity-ui/icons",
  "@heroui/react",
  "@heroui/styles",
  "@tanstack/react-query",
  "i18next",
  "leaflet",
  "react",
  "react-dom",
  "react-i18next",
  "react-leaflet",
  "react-router",
  "tailwindcss",
];
const BASE_DEV_DEPENDENCIES = [
  "@eslint/js",
  "@tailwindcss/vite",
  "@testing-library/dom",
  "@testing-library/jest-dom",
  "@testing-library/react",
  "@testing-library/user-event",
  "@types/leaflet",
  "@types/node",
  "@types/react",
  "@types/react-dom",
  "@vitejs/plugin-react",
  "@vitest/coverage-v8",
  "eslint",
  "jsdom",
  "sharp",
  "typescript",
  "typescript-eslint",
  "vite",
  "vite-plugin-pwa",
  "vitest",
];

const createdDirs: string[] = [];

const writeDist = ({ manifest, files }: Fixture): string => {
  const distDir = mkdtempSync(path.join(tmpdir(), "bundle-guard-"));
  createdDirs.push(distDir);
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(distDir, name);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, typeof content === "number" ? "a".repeat(content) : content);
  }
  if (manifest) {
    mkdirSync(path.join(distDir, ".vite"), { recursive: true });
    writeFileSync(path.join(distDir, ".vite", "manifest.json"), JSON.stringify(manifest));
  }
  return distDir;
};

const manifestOf = (entryImports: string[] = [], dynamicImports: string[] = []): Record<string, ManifestEntry> => ({
  "src/main.tsx": { file: "assets/index-a.js", isEntry: true, imports: entryImports, dynamicImports },
  "_vendor.js": { file: "assets/vendor-b.js" },
  "src/pages/map.tsx": { file: "assets/map-c.js" },
});

const okFixture = (): Fixture => ({
  manifest: manifestOf(["_vendor.js"], ["src/pages/map.tsx"]),
  files: { "assets/index-a.js": 100 * KILOBYTE, "assets/vendor-b.js": 200 * KILOBYTE, "assets/map-c.js": 700 * KILOBYTE },
});

afterAll(() => {
  for (const dir of createdDirs) rmSync(dir, { recursive: true, force: true });
});

describe("check-bundle-size budgets", () => {
  it("fixes the entry budget at 450 kB and the initial JS budget at 900 kB", () => {

    expect(ENTRY_BUDGET_BYTES).toBe(450_000);
    expect(INITIAL_JS_BUDGET_BYTES).toBe(900_000);
  });
});

describe("checkBundle", () => {
  it("passes a bundle within both budgets and reports the entry and the initial JS sizes, the lazy chunk not counted", () => {

    expect(checkBundle(writeDist(okFixture()))).toEqual({
      entryFile: "assets/index-a.js",
      entryBytes: 100 * KILOBYTE,
      initialJsBytes: 300 * KILOBYTE,
      violations: [],
    });
  });

  it("fails an entry of 451 kB and names the file, its size and the budget", () => {
    const dist = writeDist({ manifest: manifestOf(), files: { "assets/index-a.js": 451 * KILOBYTE } });

    const { violations } = checkBundle(dist);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("assets/index-a.js");
    expect(violations[0]).toContain("451000");
    expect(violations[0]).toContain("450000");
  });

  it("accepts an entry of exactly 450 kB", () => {
    const dist = writeDist({ manifest: manifestOf(), files: { "assets/index-a.js": 450 * KILOBYTE } });

    expect(checkBundle(dist).violations).toEqual([]);
  });

  it("fails an initial JS above 900 kB with an entry below 450 kB and names the total and the budget", () => {
    const dist = writeDist({
      manifest: manifestOf(["_vendor.js"]),
      files: { "assets/index-a.js": 400 * KILOBYTE, "assets/vendor-b.js": 501 * KILOBYTE },
    });

    const { entryBytes, initialJsBytes, violations } = checkBundle(dist);

    expect(entryBytes).toBe(400 * KILOBYTE);
    expect(initialJsBytes).toBe(901 * KILOBYTE);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("901000");
    expect(violations[0]).toContain("900000");
  });

  it("counts the static imports transitively", () => {
    const manifest = {
      "src/main.tsx": { file: "assets/index-a.js", isEntry: true, imports: ["_one.js"] },
      "_one.js": { file: "assets/one.js", imports: ["_two.js"] },
      "_two.js": { file: "assets/two.js" },
    };
    const dist = writeDist({ manifest, files: { "assets/index-a.js": 10, "assets/one.js": 20, "assets/two.js": 30 } });

    expect(checkBundle(dist).initialJsBytes).toBe(60);
  });

  it("does not count a dynamic import in the initial JS", () => {
    const dist = writeDist({
      manifest: manifestOf([], ["src/pages/map.tsx"]),
      files: { "assets/index-a.js": 100 * KILOBYTE, "assets/map-c.js": 800 * KILOBYTE },
    });

    const { initialJsBytes, violations } = checkBundle(dist);

    expect(initialJsBytes).toBe(100 * KILOBYTE);
    expect(violations).toEqual([]);
  });

  it("fails a gujarati woff2 and names it", () => {
    const fixture = okFixture();
    const dist = writeDist({ ...fixture, files: { ...fixture.files, "assets/shrikhand-gujarati-400-normal-x.woff2": 10 } });

    const { violations } = checkBundle(dist);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("shrikhand-gujarati-400-normal-x.woff2");
  });

  it.each(["woff", "ttf", "otf"])("fails a %s font of another subset (vietnamese)", (extension) => {
    const fixture = okFixture();
    const name = `assets/shrikhand-vietnamese-400-normal-x.${extension}`;
    const dist = writeDist({ ...fixture, files: { ...fixture.files, [name]: 10 } });

    expect(checkBundle(dist).violations.join("\n")).toContain(name);
  });

  it("accepts latin and latin-ext fonts", () => {
    const fixture = okFixture();
    const dist = writeDist({
      ...fixture,
      files: {
        ...fixture.files,
        "assets/shrikhand-latin-400-normal-x.woff2": 10,
        "assets/shrikhand-latin-ext-400-normal-y.woff2": 10,
      },
    });

    expect(checkBundle(dist).violations).toEqual([]);
  });

  it("fails a stylesheet that embeds a font inline and names it", () => {
    const fixture = okFixture();
    const dist = writeDist({
      ...fixture,
      files: { ...fixture.files, "assets/index-z.css": "@font-face{src:url(data:font/woff2;base64,AAAA)}" },
    });

    const { violations } = checkBundle(dist);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("assets/index-z.css");
  });

  it("accepts a stylesheet without inline font", () => {
    const fixture = okFixture();
    const dist = writeDist({ ...fixture, files: { ...fixture.files, "assets/index-z.css": "body{margin:0}" } });

    expect(checkBundle(dist).violations).toEqual([]);
  });

  it("asks to run the build first when the manifest is missing", () => {
    const dist = writeDist({ files: { "assets/index-a.js": 10 } });

    const { violations } = checkBundle(dist);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("npm run build");
  });
});

describe("check-bundle-size command line", () => {
  const runGuard = (distDir: string) => spawnSync("node", [SCRIPT_PATH, distDir], { encoding: "utf8" });

  it("prints the entry and the initial JS in kB and exits with 0 for a valid bundle", () => {
    const result = runGuard(writeDist(okFixture()));

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("assets/index-a.js");
    expect(result.stdout).toContain("100.0 kB");
    expect(result.stdout).toContain("300.0 kB");
  });

  it("prints each violation and exits with 1 when the entry exceeds its budget", () => {
    const result = runGuard(writeDist({ manifest: manifestOf(), files: { "assets/index-a.js": 451 * KILOBYTE } }));

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("451000");
    expect(`${result.stdout}${result.stderr}`).toContain("450000");
  });

  it("exits with 1 when the manifest is missing", () => {
    const result = runGuard(writeDist({ files: { "assets/index-a.js": 10 } }));

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("npm run build");
  });

  it("does not run its check when imported", () => {
    const output = execFileSync("node", ["-e", `import(${JSON.stringify(SCRIPT_PATH)}).then(() => console.log("imported"))`], {
      encoding: "utf8",
    });

    expect(output.trim()).toBe("imported");
  });
});

describe("project wiring", () => {
  const readProjectFile = (relativePath: string): string => readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

  it("asks vite to write the build manifest", () => {
    expect(readProjectFile("vite.config.ts")).toMatch(/build:\s*\{\s*manifest:\s*true\s*\}/);
  });

  it("exposes check:bundle and build:check scripts and adds no dependency", () => {
    const { scripts, dependencies, devDependencies } = JSON.parse(readProjectFile("package.json"));

    expect(scripts["check:bundle"]).toBe("node scripts/check-bundle-size.mjs");
    expect(scripts["build:check"]).toBe("npm run build && npm run check:bundle");
    expect(Object.keys(dependencies).sort()).toEqual(BASE_DEPENDENCIES);
    expect(Object.keys(devDependencies).sort()).toEqual(BASE_DEV_DEPENDENCIES);
  });

  it("documents the budgets, the command and what to do on an overrun", () => {
    const doc = readProjectFile("CLAUDE.md");

    expect(doc).toContain("npm run build:check");
    expect(doc).toContain("## Budget du bundle");
    expect(doc).toContain("450 kB");
    expect(doc).toContain("900 kB");
    expect(doc).toContain("LazyPage");
    expect(doc).toContain("mousseFonts");
    expect(doc).toContain("ne pas relever le budget sans accord");
  });
});
