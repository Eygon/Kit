import { contrastRatio } from "@/__tests__/utils/color/contrast";
import { resolveThemeColor } from "@/__tests__/utils/color/resolveThemeColor";

const WCAG_AA_NORMAL_TEXT = 4.5;

const MUTED = resolveThemeColor("var(--muted)");
const INK = resolveThemeColor("var(--mousse-ink)");
const CREAM = resolveThemeColor("var(--mousse-cream)");
const PAPER = resolveThemeColor("var(--mousse-paper)");

describe("mousseTheme", () => {
  it("keeps the muted text readable (WCAG AA) on the cream surface and on the paper background", () => {
    expect(contrastRatio(MUTED, CREAM)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    expect(contrastRatio(MUTED, PAPER)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  });

  it("keeps the muted text lighter than the ink so the hierarchy stays visible", () => {
    expect(contrastRatio(INK, CREAM)).toBeGreaterThan(contrastRatio(MUTED, CREAM));
  });
});
