import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mixInOklab, parseHex, type Rgb } from "@/__tests__/utils/color/contrast";

const THEME_CSS = readFileSync(resolve(process.cwd(), "src/styles/mousseTheme.css"), "utf8");

const readDeclaration = (name: string) => {
  const match = THEME_CSS.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (match === null) {
    throw new Error(`Missing declaration ${name}`);
  }
  return match[1].trim();
};

export const resolveThemeColor = (value: string): Rgb => {
  const reference = value.match(/^var\((--[\w-]+)\)$/);
  if (reference !== null) {
    return resolveThemeColor(readDeclaration(reference[1]));
  }
  const mix = value.match(/^color-mix\(in oklab,\s*(.+?)\s+(\d+)%,\s*(.+?)\s+\d+%\)$/);
  if (mix !== null) {
    return mixInOklab(resolveThemeColor(mix[1]), Number(mix[2]) / 100, resolveThemeColor(mix[3]));
  }
  return parseHex(value);
};
