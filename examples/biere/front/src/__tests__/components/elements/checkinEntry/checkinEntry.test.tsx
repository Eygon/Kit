import { screen, within } from "@testing-library/react";
import { CheckinEntry } from "@/components/elements/checkinEntry/checkinEntry";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import type { CheckinEntryProps } from "@/types/components/checkinEntry";
import type { Checkin } from "@/types/models/checkin/checkin";

const buildCheckin = (overrides: Partial<Checkin> = {}): Checkin => ({
  id: 1,
  beerId: 7,
  beerName: "Orval",
  drankAt: "2026-10-12T12:00:00.000Z",
  place: "Chez Paul",
  rating: 4.5,
  aromas: [],
  format: null,
  price: null,
  comment: "",
  photoId: null,
  ...overrides,
});

const renderEntry = (props: Partial<CheckinEntryProps> = {}) => {
  return renderWithProviders(
    <ul>
      <CheckinEntry checkin={buildCheckin()} showBeer {...props} />
    </ul>,
  );
};

describe("CheckinEntry", () => {
  it("renders a list item with the date, the place and the rating", () => {
    renderEntry();

    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("12/10/2026");
    expect(item).toHaveTextContent("Chez Paul");
    expect(item).toHaveTextContent("★ 4,5");
    expect(within(item).getByText("Note : 4,5 sur 5")).toHaveClass("sr-only");
  });

  it("links the beer name to its detail page when showBeer is set", () => {
    renderEntry();

    const link = screen.getByRole("link", { name: "Orval" });
    expect(link).toHaveAttribute("href", "/bieres/7");
    expect(link).toHaveClass("break-words");
  });

  it("shows no beer name nor link when showBeer is off", () => {
    renderEntry({ showBeer: false });

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("listitem")).not.toHaveTextContent("Orval");
  });

  it("shows nothing for a tasting without rating", () => {
    renderEntry({ checkin: buildCheckin({ rating: null }) });

    expect(screen.getByRole("listitem")).not.toHaveTextContent("★");
    expect(screen.queryByText(/Note :/)).not.toBeInTheDocument();
  });

  it("puts the rating in an amber highlight pill", () => {
    renderEntry();

    const pill = screen.getByText("★ 4,5");
    expect(pill.closest(".bg-highlight")).not.toBeNull();
    expect(pill.closest(".text-highlight-foreground")).not.toBeNull();
  });

  it("shows the photo thumbnail only when the tasting has one", () => {
    renderEntry({
      checkin: buildCheckin({
        photoId: "0b6f1c1e-6a34-4c8e-9f3a-2f6d7b1c9a10",
      }),
    });

    expect(
      screen.getByRole("img", { name: "Photo de la dégustation" }),
    ).toHaveAttribute(
      "src",
      expect.stringMatching(
        /\/api\/v1\/photos\/0b6f1c1e-6a34-4c8e-9f3a-2f6d7b1c9a10$/,
      ),
    );
    expect(
      screen.getByRole("button", { name: "Agrandir la photo" }),
    ).toBeInTheDocument();
  });

  it("renders no image without a photo", () => {
    renderEntry();

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the actions it is given", () => {
    renderEntry({ actions: <button type="button">Supprimer</button> });

    expect(
      within(screen.getByRole("listitem")).getByRole("button", {
        name: "Supprimer",
      }),
    ).toBeInTheDocument();
  });

  it("keeps the text column shrinkable and the thumbnail, rating and actions at their own size", () => {
    renderEntry({
      checkin: buildCheckin({ photoId: "0b6f1c1e-6a34-4c8e-9f3a-2f6d7b1c9a10" }),
      actions: <button type="button">Supprimer</button>,
    });

    const item = screen.getByRole("listitem");
    const text = screen.getByText("Chez Paul").parentElement as HTMLElement;
    expect(text).toHaveClass("min-w-0", "flex-1");
    const trailing = screen.getByRole("button", { name: "Agrandir la photo" }).parentElement as HTMLElement;
    expect(trailing).toHaveClass("flex", "shrink-0", "items-center");
    expect(trailing.parentElement).toBe(item);
    expect(within(trailing).getByText("★ 4,5")).toBeInTheDocument();
    expect(within(trailing).getByRole("button", { name: "Supprimer" })).toBeInTheDocument();
    expect(text.contains(trailing)).toBe(false);
  });

  it("renders no empty trailing group for a tasting without photo, rating or actions", () => {
    renderEntry({ checkin: buildCheckin({ rating: null }) });

    expect(screen.getByRole("listitem").children).toHaveLength(1);
  });

  it("lets a long unbroken place and beer name wrap", async () => {
    const place = "Brasserie-Artisanale-du-Mont-Blanc-".repeat(4);
    const beerName = "Triple-Karmeliet-Reserve-".repeat(4);
    renderEntry({ checkin: buildCheckin({ place, beerName }) });

    expect(screen.getByText(place)).toHaveClass("break-words");
    expect(screen.getByRole("link", { name: beerName })).toHaveClass(
      "break-words",
    );
  });
});
