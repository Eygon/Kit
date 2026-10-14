import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

import { APP_ICON_SPECS, generateAppIcons } from "../../../scripts/generate-app-icons.mjs";

const SCRIPT_PATH = path.resolve(process.cwd(), "scripts/generate-app-icons.mjs");
const MASCOT_PATH = path.resolve(process.cwd(), "src/assets/mascot/mascot.png");
const CREAM = [244, 241, 234, 255];

const readPixels = async (filePath: string) => {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixelAt = (x: number, y: number): number[] => {
    const offset = (y * info.width + x) * info.channels;
    return [...data.subarray(offset, offset + info.channels)];
  };
  return { width: info.width, height: info.height, pixelAt };
};

const countOpaquePixels = async (filePath: string): Promise<number> => {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let count = 0;
  for (let offset = 3; offset < data.length; offset += info.channels) if (data[offset] > 0) count += 1;
  return count;
};

const isCream = (pixel: number[]): boolean => pixel.every((channel, index) => channel === CREAM[index]);

describe("generate-app-icons", () => {
  let workDir: string;
  let outDir: string;
  let written: string[];

  beforeAll(async () => {
    workDir = mkdtempSync(path.join(tmpdir(), "app-icons-"));
    outDir = path.join(workDir, "nested", "icons");
    written = await generateAppIcons(MASCOT_PATH, outDir);
  });

  afterAll(() => rmSync(workDir, { recursive: true, force: true }));

  const fileOf = (name: string): string => path.join(outDir, name);

  it("declares the four icons with their size, scale and background", () => {
    expect(APP_ICON_SPECS).toEqual([
      { fileName: "icon-192.png", size: 192, scale: 1, background: null },
      { fileName: "icon-512.png", size: 512, scale: 1, background: null },
      { fileName: "maskable-512.png", size: 512, scale: 0.8, background: "#F4F1EA" },
      { fileName: "apple-touch-icon-180.png", size: 180, scale: 0.8, background: "#F4F1EA" },
    ]);
  });

  it("creates the output folder and returns the four written paths in spec order", () => {
    expect(written).toEqual([
      fileOf("icon-192.png"),
      fileOf("icon-512.png"),
      fileOf("maskable-512.png"),
      fileOf("apple-touch-icon-180.png"),
    ]);
    for (const filePath of written) expect(existsSync(filePath)).toBe(true);
  });

  it.each([
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["maskable-512.png", 512],
    ["apple-touch-icon-180.png", 180],
  ])("writes %s as a square PNG of exactly %i px", async (name, size) => {
    const metadata = await sharp(fileOf(name)).metadata();

    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(size);
    expect(metadata.height).toBe(size);
  });

  it("keeps the corner of icon-192 and icon-512 transparent", async () => {
    for (const name of ["icon-192.png", "icon-512.png"]) {
      const { width, height, pixelAt } = await readPixels(fileOf(name));

      expect(pixelAt(0, 0)[3]).toBe(0);
      expect(pixelAt(width - 1, height - 1)[3]).toBe(0);
    }
  });

  it.each(["icon-192.png", "icon-512.png"])("draws the mascot in %s, not a fully transparent image", async (name) => {
    const { width, height, pixelAt } = await readPixels(fileOf(name));

    expect(pixelAt(Math.floor(width / 2), Math.floor(height / 2))[3]).toBeGreaterThan(0);
    expect(await countOpaquePixels(fileOf(name))).toBeGreaterThan((width * height) / 10);
  });

  it.each(["maskable-512.png", "apple-touch-icon-180.png"])("paints the corners of %s opaque cream #F4F1EA", async (name) => {
    const { width, height, pixelAt } = await readPixels(fileOf(name));

    expect(pixelAt(0, 0)).toEqual(CREAM);
    expect(pixelAt(width - 1, 0)).toEqual(CREAM);
    expect(pixelAt(0, height - 1)).toEqual(CREAM);
    expect(pixelAt(width - 1, height - 1)).toEqual(CREAM);
  });

  it.each([
    ["maskable-512.png", 50],
    ["apple-touch-icon-180.png", 17],
  ])("keeps the 10 percent outer band of %s cream so the mascot stays in the safe zone", async (name, band) => {
    const { width, height, pixelAt } = await readPixels(fileOf(name));
    const middle = Math.floor(width / 2);

    for (let offset = 0; offset < band; offset += 1) {
      expect(pixelAt(offset, middle)).toEqual(CREAM);
      expect(pixelAt(width - 1 - offset, middle)).toEqual(CREAM);
      expect(pixelAt(middle, offset)).toEqual(CREAM);
      expect(pixelAt(middle, height - 1 - offset)).toEqual(CREAM);
    }
  });

  it.each(["maskable-512.png", "apple-touch-icon-180.png"])(
    "draws the mascot, not only the background, inside the safe zone of %s",
    async (name) => {
      const { width, height, pixelAt } = await readPixels(fileOf(name));
      const centerPixel = pixelAt(Math.floor(width / 2), Math.floor(height / 2));

      expect(centerPixel).not.toEqual(CREAM);
    },
  );

  it.each([
    ["maskable-512.png", 51],
    ["apple-touch-icon-180.png", 18],
  ])("scales the mascot of %s to 80 percent: first non-cream pixel of the middle row is at x=%i (+/- 1)", async (name, expectedX) => {
    const { width, pixelAt } = await readPixels(fileOf(name));
    const middle = Math.floor(width / 2);
    let firstMascotX = -1;
    for (let x = 0; x < width && firstMascotX === -1; x += 1) if (!isCream(pixelAt(x, middle))) firstMascotX = x;

    expect(firstMascotX).toBeGreaterThanOrEqual(expectedX - 1);
    expect(firstMascotX).toBeLessThanOrEqual(expectedX + 1);
  });

  it("rejects when the source image is missing", async () => {
    await expect(generateAppIcons(path.join(workDir, "missing.png"), path.join(workDir, "unused"))).rejects.toThrow();
    expect(existsSync(path.join(workDir, "unused", "icon-192.png"))).toBe(false);
  });

  it("writes one line per file from the command line and exits 0", () => {
    const cliOutDir = path.join(workDir, "cli-icons");
    const result = spawnSync(process.execPath, [SCRIPT_PATH, MASCOT_PATH, cliOutDir], { encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(result.stdout.trim().split("\n")).toEqual([
      path.join(cliOutDir, "icon-192.png"),
      path.join(cliOutDir, "icon-512.png"),
      path.join(cliOutDir, "maskable-512.png"),
      path.join(cliOutDir, "apple-touch-icon-180.png"),
    ]);
  });

  it("defaults to src/assets/mascot/mascot.png as source and public/icons as output when run without arguments", () => {
    // Mirror the repo layout in a temp folder so the defaults (resolved from the script location) never touch the committed icons.
    const fakeRoot = path.join(workDir, "fake-root");
    mkdirSync(path.join(fakeRoot, "scripts"), { recursive: true });
    mkdirSync(path.join(fakeRoot, "src/assets/mascot"), { recursive: true });
    copyFileSync(SCRIPT_PATH, path.join(fakeRoot, "scripts/generate-app-icons.mjs"));
    copyFileSync(MASCOT_PATH, path.join(fakeRoot, "src/assets/mascot/mascot.png"));
    symlinkSync(path.resolve(process.cwd(), "node_modules"), path.join(fakeRoot, "node_modules"), "dir");

    const result = spawnSync(process.execPath, [path.join(fakeRoot, "scripts/generate-app-icons.mjs")], { encoding: "utf8" });
    const iconsDir = path.join(fakeRoot, "public/icons");

    expect(result.status).toBe(0);
    expect(result.stdout.trim().split("\n")).toEqual(
      ["icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon-180.png"].map((name) => path.join(iconsDir, name)),
    );
    for (const name of ["icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon-180.png"]) {
      expect(existsSync(path.join(iconsDir, name))).toBe(true);
    }
  });

  it("exits non-zero with a message when the command line source is missing", () => {
    const result = spawnSync(process.execPath, [SCRIPT_PATH, path.join(workDir, "missing.png"), path.join(workDir, "cli-fail")], {
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(result.stderr.length).toBeGreaterThan(0);
  });
});

describe("package.json wiring for the icons", () => {
  const packageJson = JSON.parse(readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"));

  it("pins sharp to an exact version in devDependencies", () => {
    expect(packageJson.devDependencies.sharp).toBe("0.35.4");
    expect(packageJson.dependencies.sharp).toBeUndefined();
  });

  it("locks the sharp binary of every platform so a clean install works off linux x64", () => {
    const lockPackages = JSON.parse(readFileSync(path.resolve(process.cwd(), "package-lock.json"), "utf8")).packages;
    const sharpEntry = lockPackages["node_modules/sharp"];

    expect(sharpEntry.version).toBe("0.35.4");
    for (const [name, version] of Object.entries(sharpEntry.optionalDependencies as Record<string, string>)) {
      const entry = lockPackages[`node_modules/${name}`];

      expect(entry, name).toBeDefined();
      expect(entry.version).toBe(version);
      expect(entry.integrity).toMatch(/^sha512-/);
    }
  });

  it("exposes the icons:generate script", () => {
    expect(packageJson.scripts["icons:generate"]).toBe("node scripts/generate-app-icons.mjs");
  });
});
