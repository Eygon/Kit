import { screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { ProposedByChip } from "@/components/elements/proposedByChip/proposedByChip";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import i18n from "@/i18n/i18n";

const renderChip = (name: string) => renderWithProviders(<ProposedByChip name={name} />);

describe("ProposedByChip", () => {
  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("says who proposed the beer in French", async () => {
    renderChip("Alice");

    expect(screen.getByText("Proposée par Alice")).toBeInTheDocument();
  });

  it("says who proposed the beer in English", async () => {
    await i18n.changeLanguage("en");
    renderChip("Alice");

    expect(screen.getByText("Suggested by Alice")).toBeInTheDocument();
  });

  it("is a discreet chip that truncates inside the width of its parent", async () => {
    renderChip("Alice");

    const chip = screen.getByText("Proposée par Alice").closest("[class*='truncate']");
    expect(chip).not.toBeNull();
    expect(chip?.className).toContain("max-w-full");
  });

  it("keeps a very long unbroken name inside a truncating chip", async () => {
    const longName = "Alice-Artisane-Brasseuse-du-Mont-Blanc".repeat(4);
    renderChip(longName);

    const chip = screen.getByText(`Proposée par ${longName}`).closest("[class*='truncate']");
    expect(chip?.className).toContain("max-w-full");
  });
});
