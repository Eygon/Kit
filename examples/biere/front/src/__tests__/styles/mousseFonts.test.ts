import { readFileSync } from "node:fs";
import path from "node:path";

type FontFace = Readonly<{ family: string; weight: string; style: string; display: string; src: string; range: string }>;

const readText = (relativePath: string): string => readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

const readDeclaration = (block: string, property: string): string =>
  new RegExp(`${property}:\\s*([^;]+);`).exec(block)?.[1].trim() ?? "";

const parseFontFaces = (css: string): FontFace[] =>
  (css.match(/@font-face\s*\{[^}]*\}/g) ?? []).map((block) => ({
    family: readDeclaration(block, "font-family").replace(/["']/g, ""),
    weight: readDeclaration(block, "font-weight"),
    style: readDeclaration(block, "font-style"),
    display: readDeclaration(block, "font-display"),
    src: readDeclaration(block, "src"),
    range: readDeclaration(block, "unicode-range"),
  }));

const isCovered = (range: string, codePoint: number): boolean =>
  range.split(",").some((part) => {
    const [start, end = start] = part.trim().replace(/^U\+/, "").split("-U+").join("-").split("-");
    return codePoint >= parseInt(start, 16) && codePoint <= parseInt(end, 16);
  });

const fontsourceRange = (packageName: string, weight: number, subset: "latin" | "latin-ext"): string => {
  const css = readText(`node_modules/@fontsource/${packageName}/${weight}.css`);
  const block = css.split("/* ").find((chunk) => chunk.startsWith(`${packageName}-${subset}-${weight}-normal */`)) ?? "";
  return readDeclaration(block, "unicode-range");
};

const readFaces = (): FontFace[] => parseFontFaces(readText("src/styles/mousseFonts.css"));
const findFace = (family: string, weight: string, subset: string): FontFace | undefined =>
  readFaces().find((face) => face.family === family && face.weight === weight && new RegExp(`-${subset}-\\d{3}-normal`).test(face.src));

const EXPECTED_FACES = [
  { family: "Shrikhand", packageName: "shrikhand", weight: 400 },
  { family: "Plus Jakarta Sans", packageName: "plus-jakarta-sans", weight: 600 },
  { family: "Plus Jakarta Sans", packageName: "plus-jakarta-sans", weight: 700 },
];

describe("mousseFonts.css", () => {
  it("declares exactly six font faces: Shrikhand 400 and Plus Jakarta Sans 600 and 700, in latin and latin-ext", () => {
    expect(readFaces()).toHaveLength(6);
    for (const { family, weight } of EXPECTED_FACES) {
      expect(findFace(family, String(weight), "latin")).toBeDefined();
      expect(findFace(family, String(weight), "latin-ext")).toBeDefined();
    }
  });

  it("keeps every face normal, swapped and bound to a unicode range", () => {
    for (const face of readFaces()) {
      expect(face.style).toBe("normal");
      expect(face.display).toBe("swap");
      expect(face.range).toMatch(/^U\+/);
    }
  });

  it("points every face at a woff2 of the fontsource package, latin or latin-ext only, never a woff", () => {
    for (const face of readFaces()) {
      expect(face.src).toMatch(/^url\("?@fontsource\/[a-z-]+\/files\/[a-z-]+-(latin|latin-ext)-\d{3}-normal\.woff2"?\) format\("woff2"\)$/);
      expect(face.src).not.toMatch(/\.woff(?!2)/);
    }
  });

  it("copies the unicode ranges of fontsource unchanged", () => {
    for (const { family, packageName, weight } of EXPECTED_FACES) {
      expect(findFace(family, String(weight), "latin")?.range).toBe(fontsourceRange(packageName, weight, "latin"));
      expect(findFace(family, String(weight), "latin-ext")?.range).toBe(fontsourceRange(packageName, weight, "latin-ext"));
    }
  });

  it("renders French and English text (accents, oe, c cedilla, euro) from the latin subset alone, which is declared after latin-ext so that it wins on shared characters", () => {
    for (const { family, weight } of EXPECTED_FACES) {
      const sameFamilyFaces = readFaces().filter((face) => face.family === family && face.weight === String(weight));
      for (const codePoint of ["é", "è", "à", "ç", "œ", "€"].map((letter) => letter.codePointAt(0) ?? 0)) {
        const lastCoveringFace = sameFamilyFaces.filter((face) => isCovered(face.range, codePoint)).at(-1);
        expect(lastCoveringFace?.src).toContain("-latin-");
        expect(lastCoveringFace?.src).not.toContain("-latin-ext-");
      }
    }
  });

  it("downloads the latin-ext subset on demand for a brewery name with o double acute, l stroke or s comma", () => {
    for (const { family, weight } of EXPECTED_FACES) {
      const latinRange = findFace(family, String(weight), "latin")?.range ?? "";
      const latinExtRange = findFace(family, String(weight), "latin-ext")?.range ?? "";
      for (const codePoint of ["ő", "ł", "ș"].map((letter) => letter.codePointAt(0) ?? 0)) {
        expect(isCovered(latinExtRange, codePoint)).toBe(true);
        expect(isCovered(latinRange, codePoint)).toBe(false);
      }
    }
  });
});

describe("index.css", () => {
  it("imports the font sheet before the theme and no fontsource stylesheet any more", () => {
    const indexCss = readText("src/index.css");
    const importedSheets = [...indexCss.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)].map((match) => match[1]);

    expect(importedSheets).toContain("./styles/mousseFonts.css");
    expect(importedSheets.indexOf("./styles/mousseFonts.css")).toBeLessThan(importedSheets.indexOf("./styles/mousseTheme.css"));
    expect(importedSheets.filter((sheet) => sheet.startsWith("@fontsource/"))).toEqual([]);
    expect(indexCss).not.toMatch(/@fontsource\//);
  });
});
