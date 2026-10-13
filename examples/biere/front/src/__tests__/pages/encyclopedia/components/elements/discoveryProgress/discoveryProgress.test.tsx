import { screen } from "@testing-library/react";
import { afterEach } from "vitest";
import i18n from "@/i18n/i18n";
import { DiscoveryProgress } from "@/pages/encyclopedia/components/elements/discoveryProgress/discoveryProgress";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const renderProgress = (discovered: number, total: number) =>
  renderWithProviders(<DiscoveryProgress discovered={discovered} total={total} />);

describe("DiscoveryProgress", () => {
  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("shows 42 / 120 discovered with a ring a screen reader reads as 42 out of 120", () => {
    renderProgress(42, 120);

    expect(screen.getByText("42 / 120 découvertes")).toBeInTheDocument();
    const ring = screen.getByRole("progressbar", { name: "Progression du Pokédex" });
    expect(ring).toHaveAttribute("aria-valuenow", "42");
    expect(ring).toHaveAttribute("aria-valuemax", "120");
    expect(ring).toHaveAttribute("aria-valuemin", "0");
    expect(ring.getAttribute("aria-valuetext")).toMatch(/35/);
  });

  it("shows 0 / 120 discovered with an empty ring", () => {
    renderProgress(0, 120);

    expect(screen.getByText("0 / 120 découvertes")).toBeInTheDocument();
    const ring = screen.getByRole("progressbar", { name: "Progression du Pokédex" });
    expect(ring).toHaveAttribute("aria-valuenow", "0");
    expect(ring).toHaveAttribute("aria-valuemax", "120");
    expect(ring.getAttribute("aria-valuetext")).toMatch(/^0\s?%$/);
  });

  it("shows an empty ring without any division by zero when the catalog is empty", () => {
    renderProgress(0, 0);

    expect(screen.getByText("0 / 0 découvertes")).toBeInTheDocument();
    const ring = screen.getByRole("progressbar", { name: "Progression du Pokédex" });
    expect(ring).toHaveAttribute("aria-valuenow", "0");
    expect(ring.outerHTML).not.toMatch(/NaN|Infinity/);
  });

  it("writes the label and the ring name in English when the language is English", async () => {
    await i18n.changeLanguage("en");

    renderProgress(42, 120);

    expect(screen.getByText("42 / 120 discovered")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Pokédex progress" })).toHaveAttribute("aria-valuenow", "42");
  });

  it("writes the label in the display font", () => {
    renderProgress(42, 120);

    expect(screen.getByText("42 / 120 découvertes")).toHaveClass("font-display");
  });
});
