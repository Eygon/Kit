import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckinEntry } from "@/components/elements/checkinEntry/checkinEntry";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
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
  venueId: null,
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
    const header = trailing.parentElement as HTMLElement;
    expect(header).toHaveClass("flex", "min-w-0", "items-start", "justify-between");
    expect(header.parentElement).toBe(item);
    expect(text.parentElement).toBe(header);
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

  it("shows a free place as plain text without a link", () => {
    renderEntry({ showBeer: false, checkin: buildCheckin({ place: "Chez moi", venueId: null }) });

    expect(screen.getByText("Chez moi").tagName).toBe("SPAN");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("links a place tied to a venue to the map opened on that venue", () => {
    renderEntry({ showBeer: false, checkin: buildCheckin({ place: "Delirium Café", venueId: 42 }) });

    const link = screen.getByRole("link", { name: "Delirium Café" });
    expect(link).toHaveAttribute("href", "/carte?venue=42");
    expect(link).toHaveClass("min-h-11", "break-words", "text-accent", "focus-visible:focus-ring");
  });

  it("keeps the beer link and the venue link side by side", () => {
    renderEntry({ checkin: buildCheckin({ place: "Delirium Café", venueId: 42 }) });

    const links = within(screen.getByRole("listitem")).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/bieres/7", "/carte?venue=42"]);
  });

  it("lets a long unbroken venue name wrap", () => {
    const place = "Brasserie-Artisanale-du-Mont-Blanc-".repeat(4);
    renderEntry({ showBeer: false, checkin: buildCheckin({ place, venueId: 3 }) });

    expect(screen.getByRole("link", { name: place })).toHaveClass("break-words");
  });

  describe("format, price and comment", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    const stubOverflow = (isOverflowing: boolean) => {
      vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(isOverflowing ? 96 : 48);
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(48);
    };

    it("shows Pression, 6,50 € and the whole short comment under the place, with no Voir plus", () => {
      stubOverflow(false);
      renderEntry({
        checkin: buildCheckin({ format: BeerFormatEnum.DRAFT, price: 6.5, comment: "Bien fraîche", venueId: 42 }),
      });

      const item = screen.getByRole("listitem");
      const place = within(item).getByRole("link", { name: "Chez Paul" });
      const format = within(item).getByText("Pression");
      const price = within(item).getByText(/^6,50\s€$/);
      const comment = within(item).getByText("Bien fraîche");
      expect(place.compareDocumentPosition(format) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(format.compareDocumentPosition(price) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(price.compareDocumentPosition(comment) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(comment).not.toHaveClass("hidden");
      expect(within(item).queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
    });

    it.each([
      [BeerFormatEnum.BOTTLE, "Bouteille"],
      [BeerFormatEnum.CAN, "Canette"],
      [BeerFormatEnum.DRAFT, "Pression"],
    ])("labels the %s format %s", (format, label) => {
      renderEntry({ checkin: buildCheckin({ format }) });

      expect(within(screen.getByRole("listitem")).getByText(label)).toBeInTheDocument();
    });

    it("shows a free beer as 0,00 € since a price of 0 is a price", () => {
      renderEntry({ checkin: buildCheckin({ price: 0 }) });

      expect(screen.getByRole("listitem")).toHaveTextContent(/0,00\s€/);
    });

    it("renders nothing for a tasting without rating, format, price nor comment", () => {
      renderEntry({ checkin: buildCheckin({ rating: null, format: null, price: null, comment: "" }) });

      const item = screen.getByRole("listitem");
      expect(item).not.toHaveTextContent("null");
      expect(item).not.toHaveTextContent("€");
      expect(item).not.toHaveTextContent("★");
      expect(item.textContent).toBe("12/10/2026Orval" + "Chez Paul");
      expect(within(item).queryByRole("button")).not.toBeInTheDocument();
      expect(item.querySelectorAll("p")).toHaveLength(0);
    });

    it("shows no comment block for a comment made of spaces", () => {
      renderEntry({ checkin: buildCheckin({ comment: "   " }) });

      expect(screen.getByRole("listitem").querySelectorAll("p")).toHaveLength(0);
    });

    it("folds a comment over 3 lines behind Voir plus, which unfolds and folds it again", async () => {
      stubOverflow(true);
      const user = userEvent.setup();
      const comment = "Un très long commentaire ".repeat(30).trim();
      renderEntry({ checkin: buildCheckin({ comment }) });

      const text = screen.getByText(comment);
      expect(text).toHaveClass("line-clamp-3");
      await user.click(screen.getByRole("button", { name: "Voir plus" }));
      expect(text).not.toHaveClass("line-clamp-3");
      expect(screen.getByRole("button", { name: "Voir moins" })).toHaveAttribute("aria-expanded", "true");
      await user.click(screen.getByRole("button", { name: "Voir moins" }));
      expect(text).toHaveClass("line-clamp-3");
    });

    it("keeps the text column shrinkable with a long unbroken comment", () => {
      const comment = "Délicieuse".repeat(40);
      renderEntry({ checkin: buildCheckin({ comment, format: BeerFormatEnum.CAN, price: 3 }) });

      const column = screen.getByText("Chez Paul").parentElement as HTMLElement;
      const item = screen.getByRole("listitem");
      expect(column).toHaveClass("min-w-0", "flex-1");
      // le commentaire et le format passent sous l'en-tête, sur toute la largeur de la carte (pas dans la colonne étroite)
      expect(item).toContainElement(screen.getByText(comment));
      expect(column).not.toContainElement(screen.getByText(comment));
      expect(column).not.toContainElement(screen.getByText("Canette"));
      expect(screen.getByText(comment)).toHaveClass("break-words");
    });

    it("keeps the rating pill and the actions beside the text", () => {
      renderEntry({
        checkin: buildCheckin({ format: BeerFormatEnum.CAN, price: 3, comment: "Top" }),
        actions: <button type="button">Modifier</button>,
      });

      const item = screen.getByRole("listitem");
      expect(within(item).getByText("★ 4,5")).toBeInTheDocument();
      expect(within(item).getByRole("button", { name: "Modifier" })).toBeInTheDocument();
    });
  });
});
