import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const CREAM = "#F4F1EA";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SOURCE_PATH = path.resolve(SCRIPT_DIR, "../src/assets/mascot/mascot.png");
const DEFAULT_OUT_DIR = path.resolve(SCRIPT_DIR, "../public/icons");
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

export const APP_ICON_SPECS = Object.freeze([
  Object.freeze({ fileName: "icon-192.png", size: 192, scale: 1, background: null }),
  Object.freeze({ fileName: "icon-512.png", size: 512, scale: 1, background: null }),
  Object.freeze({ fileName: "maskable-512.png", size: 512, scale: 0.8, background: CREAM }),
  Object.freeze({ fileName: "apple-touch-icon-180.png", size: 180, scale: 0.8, background: CREAM }),
]);

const writeIcon = async (sourcePath, outDir, { fileName, size, scale, background }) => {
  const innerSize = Math.round(size * scale);
  const margin = size - innerSize;
  const before = Math.floor(margin / 2);
  const after = margin - before;
  const fill = background ?? TRANSPARENT;
  const outputPath = path.join(outDir, fileName);

  await sharp(sourcePath)
    .resize(innerSize, innerSize, { fit: "contain", background: TRANSPARENT })
    .extend({ top: before, bottom: after, left: before, right: after, background: fill })
    .png()
    .toFile(outputPath);

  return outputPath;
};

export const generateAppIcons = async (sourcePath, outDir) => {
  await sharp(sourcePath).metadata();
  await mkdir(outDir, { recursive: true });
  const written = [];
  for (const spec of APP_ICON_SPECS) written.push(await writeIcon(sourcePath, outDir, spec));
  return written;
};

const runCli = async () => {
  const sourcePath = process.argv[2] ?? DEFAULT_SOURCE_PATH;
  const outDir = process.argv[3] ?? DEFAULT_OUT_DIR;
  try {
    for (const filePath of await generateAppIcons(sourcePath, outDir)) process.stdout.write(`${filePath}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await runCli();
