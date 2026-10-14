import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type ManifestIcon = { src: string; sizes: string; type: string; purpose: string };

const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const PNG_DIMENSIONS_OFFSET = 16;
const PNG_DIMENSIONS_END = 24;

const readManifest = () => JSON.parse(readFileSync(path.join(PUBLIC_DIR, "manifest.webmanifest"), "utf8"));

const readPngDimensions = (filePath: string): string => {
  const header = readFileSync(filePath).subarray(PNG_DIMENSIONS_OFFSET, PNG_DIMENSIONS_END);
  return `${header.readUInt32BE(0)}x${header.readUInt32BE(4)}`;
};

describe("public/manifest.webmanifest", () => {
  it.each([
    ["name", "Mousse"],
    ["short_name", "Mousse"],
    ["lang", "fr"],
    ["start_url", "/"],
    ["scope", "/"],
    ["display", "standalone"],
    ["orientation", "portrait"],
    ["theme_color", "#2D6A4F"],
    ["background_color", "#F4F1EA"],
  ])("declares %s as %s", (field, expected) => {
    expect(readManifest()[field]).toBe(expected);
  });

  it("declares exactly the 192, 512 and maskable 512 icons", () => {
    expect(readManifest().icons).toEqual([
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ]);
  });

  it("has every declared icon on disk under public with the declared dimensions", () => {
    const icons: ManifestIcon[] = readManifest().icons;

    expect(icons).toHaveLength(3);
    for (const { src, sizes } of icons) {
      const filePath = path.join(PUBLIC_DIR, src);

      expect(existsSync(filePath)).toBe(true);
      expect(readPngDimensions(filePath)).toBe(sizes);
    }
  });
});
