import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { CollectionBeerRow } from "@/pages/collection/components/elements/collectionBeerRow/collectionBeerRow";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { CollectionBeer } from "@/types/models/collection/collectionBeer";

const buildBeer = (
  overrides: Partial<CollectionBeer> = {},
): CollectionBeer => ({
  beerId: 12,
  beerName: "Orval",
  styleName: "Trappiste",
  family: BeerFamilyEnum.TRAPPIST,
  drunkByMe: true,
  addedAt: new Date("2026-10-12T10:00:00.000Z"),
  ...overrides,
});

const renderRow = (
  beer: CollectionBeer,
  actions: Partial<Parameters<typeof CollectionBeerRow>[0]> = {},
) =>
  renderWithProviders(
    <ul>
      <CollectionBeerRow beer={beer} {...actions} />
    </ul>,
  );

describe("CollectionBeerRow", () => {
  it("links the beer name to its sheet and shows its style", () => {
    renderRow(buildBeer());

    expect(screen.getByRole("link", { name: "Orval" })).toHaveAttribute(
      "href",
      "/bieres/12",
    );
    expect(screen.getByText("Trappiste")).toBeInTheDocument();
  });

  it("stamps a beer I drank as already tasted", () => {
    renderRow(buildBeer({ drunkByMe: true }));

    expect(screen.getByText("Déjà bue")).toBeInTheDocument();
    expect(screen.queryByText("Pas encore")).not.toBeInTheDocument();
  });

  it("stamps a beer I did not drink as not yet", () => {
    renderRow(buildBeer({ beerId: 13, beerName: "Duvel", drunkByMe: false }));

    expect(screen.getByText("Pas encore")).toBeInTheDocument();
    expect(screen.queryByText("Déjà bue")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Duvel" })).toHaveAttribute(
      "href",
      "/bieres/13",
    );
  });

  it("keeps a very long unbroken name wrapping inside its row", async () => {
    const longName = "B".repeat(100);
    renderRow(buildBeer({ beerName: longName }));

    const link = screen.getByRole("link", { name: longName });
    expect(link.className).toContain("break-words");
    expect(link.closest("li")?.className).toContain("min-w-0");
  });

  it("offers no Retirer button when the row is not removable", () => {
    renderRow(buildBeer());

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("puts the Retirer button inside the single listitem, on the same row as the beer", () => {
    renderRow(buildBeer(), { onRemove: vi.fn() });

    const button = screen.getByRole("button", {
      name: "Retirer Orval de la collection",
    });
    const row = screen.getByRole("listitem");

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(row).toContainElement(button);
    expect(row).toContainElement(screen.getByRole("link", { name: "Orval" }));
    expect(row.className).toContain("items-center");
    expect(button.className).toContain("shrink-0");
    expect(button.className).toContain("button--danger-soft");
    expect(button.className).toContain("button--lg");
    expect(
      screen.getByRole("link", { name: "Orval" }).closest("div")?.className,
    ).toContain("min-w-0");
  });

  it("calls onRemove when Retirer is pressed", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    renderRow(buildBeer(), { onRemove });

    await user.click(
      screen.getByRole("button", { name: "Retirer Orval de la collection" }),
    );

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("disables Retirer and ignores presses while the removal is pending", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    renderRow(buildBeer(), { onRemove, isRemoving: true });

    const button = screen.getByRole("button", {
      name: "Retirer Orval de la collection",
    });
    await user.click(button);

    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(onRemove).not.toHaveBeenCalled();
  });
});
