import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const html = readFileSync(path.resolve(process.cwd(), "index.html"), "utf8");

const readHref = (rel: string): string | undefined =>
  html.match(new RegExp(`<link rel="${rel}" href="([^"]+)"\\s*/>`))?.[1];

describe("index.html", () => {
  it("links the web manifest", () => {
    expect(readHref("manifest")).toBe("/manifest.webmanifest");
  });

  it("links the 180 px apple touch icon", () => {
    expect(readHref("apple-touch-icon")).toBe("/icons/apple-touch-icon-180.png");
  });

  it.each(["manifest", "apple-touch-icon"])("points the %s link to a file of the public folder", (rel) => {
    const href = readHref(rel) as string;

    expect(existsSync(path.join(process.cwd(), "public", href))).toBe(true);
  });

  it("keeps the browser bar color, the viewport, the title and no favicon", () => {
    expect(html).toContain('<meta name="theme-color" content="#F0EAE1" />');
    expect(html).toContain("viewport-fit=cover");
    expect(html).toContain("<title>Mousse</title>");
    expect(html).not.toMatch(/rel="(?:shortcut )?icon"/);
  });
});
