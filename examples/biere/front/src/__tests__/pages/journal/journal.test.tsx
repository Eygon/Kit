import { toast } from "@heroui/react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import CheckinService from "@/api/checkins/checkinService";
import { JournalPage } from "@/pages/journal/journal";
import { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import type { Checkin } from "@/types/models/checkin/checkin";

vi.mock("@/api/checkins/checkinService", () => ({
  default: { getPage: vi.fn(), remove: vi.fn() },
}));

const TOTAL = 25;
const PAGE_SIZE = 20;

const buildCheckin = (
  id: number,
  overrides: Partial<Checkin> = {},
): Checkin => ({
  id,
  beerId: 100 + id,
  beerName: `Bière ${id}`,
  drankAt: "2026-10-12T12:00:00.000Z",
  place: `Bar ${id}`,
  rating: 4,
  aromas: [],
  format: null,
  price: null,
  comment: "",
  photoId: null,
  venueId: null,
  ...overrides,
});

const stubPages = (total = TOTAL, firstId = total) => {
  (CheckinService.getPage as Mock).mockImplementation(
    async (_beerId: number | null, page: number) => ({
      items: Array.from(
        {
          length: Math.max(
            0,
            Math.min(PAGE_SIZE, total - (page - 1) * PAGE_SIZE),
          ),
        },
        (_, index) =>
          buildCheckin(firstId - ((page - 1) * PAGE_SIZE + index), {
            photoId:
              index === 0 && page === 1
                ? "0b6f1c1e-6a34-4c8e-9f3a-2f6d7b1c9a10"
                : null,
          }),
      ),
      total,
      page,
      size: PAGE_SIZE,
    }),
  );
};

describe("JournalPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubPages();
  });

  it("shows 20 of 25 tastings in a vertical timeline, each with date, beer link, place, rating and thumbnail", async () => {
    renderWithProviders(<JournalPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Journal" }),
    ).toBeInTheDocument();
    const list = await screen.findByRole("list");
    expect(list.tagName).toBe("OL");
    expect(list).toHaveClass("border-mousse", "border-y-0", "border-r-0");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(20);
    expect(items[0]).toHaveTextContent("12/10/2026");
    expect(items[0]).toHaveTextContent("Bar 25");
    expect(items[0]).toHaveTextContent("★ 4");
    expect(
      within(items[0]).getByRole("link", { name: "Bière 25" }),
    ).toHaveAttribute("href", "/bieres/125");
    expect(
      within(items[0]).getByRole("img", { name: "Photo de la dégustation" }),
    ).toBeInTheDocument();
    expect(within(items[1]).queryByRole("img")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Voir plus" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("links a venue place to the map opened on it and keeps a free place as plain text", async () => {
    (CheckinService.getPage as Mock).mockResolvedValue({
      items: [
        buildCheckin(2, { place: "Delirium Café", venueId: 42 }),
        buildCheckin(1, { place: "Chez moi", venueId: null }),
      ],
      total: 2,
      page: 1,
      size: PAGE_SIZE,
    });

    renderWithProviders(<JournalPage />);

    const items = within(await screen.findByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    const venueLink = within(items[0]).getByRole("link", { name: "Delirium Café" });
    expect(venueLink).toHaveAttribute("href", "/carte?venue=42");
    expect(venueLink).toHaveClass("min-h-11", "text-accent", "focus-visible:focus-ring");
    expect(within(items[1]).getByText("Chez moi").tagName).toBe("SPAN");
    expect(within(items[1]).getAllByRole("link")).toHaveLength(1);
    expect(within(items[1]).queryByRole("link", { name: "Chez moi" })).not.toBeInTheDocument();
  });

  it("keeps the place text of a tasting whose venue link is stale", async () => {
    (CheckinService.getPage as Mock).mockResolvedValue({
      items: [buildCheckin(1, { place: "Le Vieux Zinc", venueId: 999 })],
      total: 1,
      page: 1,
      size: PAGE_SIZE,
    });

    renderWithProviders(<JournalPage />);

    expect(await screen.findByRole("link", { name: "Le Vieux Zinc" })).toHaveAttribute("href", "/carte?venue=999");
    expect(screen.getByRole("listitem")).toHaveTextContent("Le Vieux Zinc");
  });

  it("adds the 5 other tastings on Voir plus then removes the button", async () => {
    const user = userEvent.setup();
    renderWithProviders(<JournalPage />);

    await user.click(await screen.findByRole("button", { name: "Voir plus" }));

    await waitFor(() =>
      expect(
        within(screen.getByRole("list")).getAllByRole("listitem"),
      ).toHaveLength(25),
    );
    expect(screen.getByRole("link", { name: "Bière 1" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Voir plus" }),
    ).not.toBeInTheDocument();
    expect((CheckinService.getPage as Mock).mock.calls).toEqual([
      [null, 1],
      [null, 2],
    ]);
  });

  it("asks for a single next page when Voir plus is pressed twice in the same tick", async () => {
    renderWithProviders(<JournalPage />);
    const button = await screen.findByRole("button", { name: "Voir plus" });
    (CheckinService.getPage as Mock).mockReturnValue(
      new Promise(() => undefined),
    );

    fireEvent.click(button);
    fireEvent.click(button);

    expect(CheckinService.getPage).toHaveBeenCalledTimes(2);
    expect((CheckinService.getPage as Mock).mock.calls[1]).toEqual([null, 2]);
  });

  it("shows the searching mascot empty state and no list when there is no tasting", async () => {
    stubPages(0);

    const { container } = renderWithProviders(<JournalPage />);

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Aucune dégustation pour l'instant",
      }),
    ).toBeInTheDocument();
    expect(container.querySelector('[data-slot="mascot"]')).toHaveAttribute(
      "data-mood",
      MascotMoodEnum.SEARCHING,
    );
    expect(
      screen.getByText("Vos notes de dégustation apparaîtront ici."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Voir plus" }),
    ).not.toBeInTheDocument();
  });

  it("shows skeletons while loading, with no list, no empty state and no alert", () => {
    (CheckinService.getPage as Mock).mockReturnValue(
      new Promise(() => undefined),
    );

    const { container } = renderWithProviders(<JournalPage />);

    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
    expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Aucune dégustation pour l'instant"),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a danger alert with Réessayer on error and loads the list on retry", async () => {
    (CheckinService.getPage as Mock).mockRejectedValue(
      new Error("server down"),
    );
    const user = userEvent.setup();
    renderWithProviders(<JournalPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger le journal.");
    expect(
      screen.queryByText("Aucune dégustation pour l'instant"),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    stubPages();
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));

    await waitFor(() =>
      expect(
        within(screen.getByRole("list")).getAllByRole("listitem"),
      ).toHaveLength(20),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the loaded tastings and retries the next page when it fails", async () => {
    const user = userEvent.setup();
    renderWithProviders(<JournalPage />);
    await screen.findByRole("list");
    (CheckinService.getPage as Mock).mockRejectedValue(
      new Error("server down"),
    );

    await user.click(screen.getByRole("button", { name: "Voir plus" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger le journal.");
    expect(
      within(screen.getByRole("list")).getAllByRole("listitem"),
    ).toHaveLength(20);

    stubPages();
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));

    await waitFor(() =>
      expect(
        within(screen.getByRole("list")).getAllByRole("listitem"),
      ).toHaveLength(25),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  describe("the detail of a tasting", () => {
    const LONG_COMMENT = "Robe cuivrée, mousse tenace, belle amertume en finale ".repeat(8).trim();
    const DETAILED = buildCheckin(2, {
      place: "Delirium Café",
      venueId: 42,
      rating: 3.5,
      format: BeerFormatEnum.DRAFT,
      price: 6.5,
      comment: LONG_COMMENT,
    });
    const BARE = buildCheckin(1, { rating: null, format: null, price: null, comment: "" });

    const entryOf = async (beerName: string) => {
      const link = await screen.findByRole("link", { name: beerName });
      return link.closest("li") as HTMLElement;
    };

    const stubOverflow = (isOverflowing: boolean) => {
      vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(isOverflowing ? 96 : 48);
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(48);
    };

    const stubTwoTastings = (first: Checkin = DETAILED) =>
      (CheckinService.getPage as Mock).mockResolvedValue({ items: [first, BARE], total: 2, page: 1, size: PAGE_SIZE });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("shows the format, the price and the folded comment with Voir plus on the card of a long comment", async () => {
      stubOverflow(true);
      stubTwoTastings();
      renderWithProviders(<JournalPage />);

      const card = await entryOf("Bière 2");

      expect(within(card).getByText("Pression")).toBeInTheDocument();
      expect(within(card).getByText(/^6,50\s€$/)).toBeInTheDocument();
      expect(within(card).getByText(LONG_COMMENT)).toHaveClass("line-clamp-3");
      expect(within(card).getByRole("button", { name: "Voir plus" })).toHaveAttribute("aria-expanded", "false");
    });

    it("unfolds the comment of that card only, then folds it again", async () => {
      stubOverflow(true);
      const user = userEvent.setup();
      stubTwoTastings();
      renderWithProviders(<JournalPage />);
      const card = await entryOf("Bière 2");

      await user.click(within(card).getByRole("button", { name: "Voir plus" }));

      expect(within(card).getByText(LONG_COMMENT)).not.toHaveClass("line-clamp-3");
      expect(within(card).getByRole("button", { name: "Voir moins" })).toHaveAttribute("aria-expanded", "true");
      await user.click(within(card).getByRole("button", { name: "Voir moins" }));
      expect(within(card).getByText(LONG_COMMENT)).toHaveClass("line-clamp-3");
    });

    it("shows a short comment whole, with no Voir plus", async () => {
      stubOverflow(false);
      stubTwoTastings({ ...DETAILED, comment: "Bien fraîche" });
      renderWithProviders(<JournalPage />);

      const card = await entryOf("Bière 2");

      expect(within(card).getByText("Pression")).toBeInTheDocument();
      expect(within(card).getByText(/^6,50\s€$/)).toBeInTheDocument();
      expect(within(card).getByText("Bien fraîche")).toBeInTheDocument();
      expect(within(card).queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
    });

    it("shows no format, price, comment, rating nor null on the card of a bare tasting", async () => {
      stubOverflow(true);
      stubTwoTastings();
      renderWithProviders(<JournalPage />);

      const card = await entryOf("Bière 1");

      expect(card).not.toHaveTextContent("null");
      expect(card).not.toHaveTextContent("€");
      expect(card).not.toHaveTextContent("★");
      expect(within(card).queryByText("Pression")).not.toBeInTheDocument();
      expect(within(card).queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
      expect(card.querySelectorAll("p")).toHaveLength(0);
    });
  });

  describe("deleting a tasting", () => {
    const entryOf = async (beerName: string) => {
      const link = await screen.findByRole("link", { name: beerName });
      return link.closest("li") as HTMLElement;
    };

    it("puts a Supprimer button on every tasting", async () => {
      renderWithProviders(<JournalPage />);

      const items = within(await screen.findByRole("list")).getAllByRole("listitem");

      expect(items).toHaveLength(20);
      items.forEach((item) => expect(within(item).getByRole("button", { name: "Supprimer" })).toBeInTheDocument());
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    it("asks for a confirmation on Supprimer and removes nothing when cancelled", async () => {
      const user = userEvent.setup();
      renderWithProviders(<JournalPage />);
      const entry = await entryOf("Bière 25");

      await user.click(within(entry).getByRole("button", { name: "Supprimer" }));
      const dialog = await screen.findByRole("alertdialog", { name: "Supprimer cette dégustation ?" });
      await user.click(within(dialog).getByRole("button", { name: "Annuler" }));

      await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
      expect(CheckinService.remove).not.toHaveBeenCalled();
      expect(screen.getByRole("link", { name: "Bière 25" })).toBeInTheDocument();
      expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(20);
    });

    it("removes the confirmed tasting, shows the success message and reloads the list", async () => {
      const success = vi.spyOn(toast, "success").mockReturnValue("toast-key");
      const user = userEvent.setup();
      (CheckinService.remove as Mock).mockImplementation(async () => {
        stubPages(TOTAL - 1);
      });
      renderWithProviders(<JournalPage />);
      const entry = await entryOf("Bière 25");

      await user.click(within(entry).getByRole("button", { name: "Supprimer" }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

      await waitFor(() => expect(screen.queryByRole("link", { name: "Bière 25" })).not.toBeInTheDocument());
      expect((CheckinService.remove as Mock).mock.calls).toEqual([[25]]);
      expect(success).toHaveBeenCalledWith("Dégustation supprimée.");
      expect(success).toHaveBeenCalledTimes(1);
      expect((CheckinService.getPage as Mock).mock.calls.length).toBeGreaterThan(1);
      success.mockRestore();
    });

    it("falls back to the searching mascot empty state when the last tasting is deleted", async () => {
      const success = vi.spyOn(toast, "success").mockReturnValue("toast-key");
      const user = userEvent.setup();
      stubPages(1);
      (CheckinService.remove as Mock).mockImplementation(async () => {
        stubPages(0);
      });
      const { container } = renderWithProviders(<JournalPage />);
      const entry = await entryOf("Bière 1");

      await user.click(within(entry).getByRole("button", { name: "Supprimer" }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

      expect(
        await screen.findByRole("heading", { level: 2, name: "Aucune dégustation pour l'instant" }),
      ).toBeInTheDocument();
      expect(container.querySelector('[data-slot="mascot"]')).toHaveAttribute("data-mood", MascotMoodEnum.SEARCHING);
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      success.mockRestore();
    });

    it("drops Voir plus and the empty second page when the only tasting of page 2 is deleted", async () => {
      const success = vi.spyOn(toast, "success").mockReturnValue("toast-key");
      const user = userEvent.setup();
      stubPages(21);
      renderWithProviders(<JournalPage />);
      await user.click(await screen.findByRole("button", { name: "Voir plus" }));
      await waitFor(() => expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(21));
      expect(screen.queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
      (CheckinService.remove as Mock).mockImplementation(async () => {
        stubPages(20, 21);
      });
      (CheckinService.getPage as Mock).mockClear();

      await user.click(within(await entryOf("Bière 1")).getByRole("button", { name: "Supprimer" }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

      await waitFor(() => expect(screen.queryByRole("link", { name: "Bière 1" })).not.toBeInTheDocument());
      expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(20);
      expect(screen.queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect((CheckinService.getPage as Mock).mock.calls).toEqual([[null, 1]]);
      success.mockRestore();
    });

    it("refreshes both loaded pages after a deletion and keeps the next page reachable", async () => {
      const success = vi.spyOn(toast, "success").mockReturnValue("toast-key");
      const user = userEvent.setup();
      stubPages(45);
      renderWithProviders(<JournalPage />);
      await user.click(await screen.findByRole("button", { name: "Voir plus" }));
      await waitFor(() => expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(40));
      (CheckinService.remove as Mock).mockImplementation(async () => {
        stubPages(44);
      });

      await user.click(within(await entryOf("Bière 45")).getByRole("button", { name: "Supprimer" }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

      await waitFor(() => expect(screen.queryByRole("link", { name: "Bière 45" })).not.toBeInTheDocument());
      expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(40);
      expect(screen.getByRole("link", { name: "Bière 44" })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Voir plus" }));
      await waitFor(() => expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(44));
      expect(screen.queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
      success.mockRestore();
    });

    it("keeps the tasting and shows no success message when the server fails", async () => {
      const success = vi.spyOn(toast, "success").mockReturnValue("toast-key");
      const user = userEvent.setup();
      (CheckinService.remove as Mock).mockRejectedValue(new Error("server down"));
      renderWithProviders(<JournalPage />);
      const entry = await entryOf("Bière 25");

      await user.click(within(entry).getByRole("button", { name: "Supprimer" }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

      await waitFor(() => expect(CheckinService.remove).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
      expect(screen.getByRole("link", { name: "Bière 25" })).toBeInTheDocument();
      expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(20);
      expect(success).not.toHaveBeenCalled();
      success.mockRestore();
    });
  });

  describe("editing a tasting", () => {
    const entryOf = async (beerName: string) => {
      const link = await screen.findByRole("link", { name: beerName });
      return link.closest("li") as HTMLElement;
    };

    const openEditSheet = async (user: ReturnType<typeof userEvent.setup>, beerName: string) => {
      await user.click(within(await entryOf(beerName)).getByRole("button", { name: "Modifier la dégustation" }));
      return screen.findByRole("dialog");
    };

    it("puts a Modifier and a Supprimer button of at least 44 px on every tasting", async () => {
      renderWithProviders(<JournalPage />);

      const items = within(await screen.findByRole("list")).getAllByRole("listitem");

      expect(items).toHaveLength(20);
      items.forEach((item) => {
        const edit = within(item).getByRole("button", { name: "Modifier la dégustation" });
        const remove = within(item).getByRole("button", { name: "Supprimer" });
        expect(edit).toHaveClass("button--lg", "button--icon-only");
        expect(remove).toHaveClass("button--lg", "button--icon-only");
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("opens the sheet of this very tasting, prefilled, when Modifier is pressed", async () => {
      const user = userEvent.setup();
      renderWithProviders(<JournalPage />);

      const dialog = await openEditSheet(user, "Bière 24");

      expect(within(dialog).getByRole("heading", { name: "Modifier : Bière 24" })).toBeInTheDocument();
      expect(within(dialog).getByRole("combobox", { name: /^Lieu/ })).toHaveValue("Bar 24");
      expect(screen.getAllByRole("dialog")).toHaveLength(1);
    });

    it("prefills the sheet with the rating, the aromas, the format, the price and the comment of that tasting", async () => {
      const user = userEvent.setup();
      (CheckinService.getPage as Mock).mockResolvedValue({
        items: [
          buildCheckin(2, {
            place: "Delirium Café",
            venueId: 42,
            rating: 3.5,
            aromas: [BeerAromaEnum.FRUITY],
            format: BeerFormatEnum.CAN,
            price: 6.5,
            comment: "Bien fraîche",
          }),
          buildCheckin(1, { place: "Chez moi", rating: 1, format: BeerFormatEnum.BOTTLE, price: 2, comment: "Autre" }),
        ],
        total: 2,
        page: 1,
        size: PAGE_SIZE,
      });
      renderWithProviders(<JournalPage />);

      const dialog = await openEditSheet(user, "Bière 2");

      expect(within(dialog).getByRole("combobox", { name: /^Lieu/ })).toHaveValue("Delirium Café");
      expect(within(dialog).getByText("3,5 / 5")).toBeInTheDocument();
      expect(within(dialog).getByRole("row", { name: "Fruité" })).toHaveAttribute("aria-selected", "true");
      expect(within(dialog).getByRole("radio", { name: "Canette" })).toBeChecked();
      expect(within(dialog).getByRole("radio", { name: "Bouteille" })).not.toBeChecked();
      expect((within(dialog).getByRole("textbox", { name: "Prix" }) as HTMLInputElement).value).toMatch(/6,50/);
      expect((within(dialog).getByLabelText("Commentaire") as HTMLTextAreaElement).value).toBe("Bien fraîche");
    });

    it("offers the wrong-beer deletion in the sheet and closes the sheet once the tasting is deleted", async () => {
      const user = userEvent.setup();
      (CheckinService.remove as Mock).mockImplementation(async () => {
        stubPages(TOTAL - 1);
      });
      renderWithProviders(<JournalPage />);
      const dialog = await openEditSheet(user, "Bière 25");

      await user.click(within(dialog).getByRole("button", { name: "Mauvaise bière ? Supprimer et recréer" }));
      const confirmation = await screen.findByRole("alertdialog", { name: "Supprimer cette dégustation ?" });
      await user.click(within(confirmation).getByRole("button", { name: "Supprimer" }));

      await waitFor(() => expect(CheckinService.remove).toHaveBeenCalledWith(25));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    it("closes the sheet through onDeleted even while the deleted tasting is still listed", async () => {
      const user = userEvent.setup();
      (CheckinService.remove as Mock).mockResolvedValue(undefined);
      renderWithProviders(<JournalPage />);
      const dialog = await openEditSheet(user, "Bière 25");

      await user.click(within(dialog).getByRole("button", { name: "Mauvaise bière ? Supprimer et recréer" }));
      const confirmation = await screen.findByRole("alertdialog", { name: "Supprimer cette dégustation ?" });
      await user.click(within(confirmation).getByRole("button", { name: "Supprimer" }));

      await waitFor(() => expect(CheckinService.remove).toHaveBeenCalledWith(25));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(await screen.findByRole("link", { name: "Bière 25" })).toBeInTheDocument();
    });

    it("keeps the sheet open and deletes nothing when the wrong-beer confirmation is cancelled", async () => {
      const user = userEvent.setup();
      renderWithProviders(<JournalPage />);
      const dialog = await openEditSheet(user, "Bière 25");

      await user.click(within(dialog).getByRole("button", { name: "Mauvaise bière ? Supprimer et recréer" }));
      const confirmation = await screen.findByRole("alertdialog");
      await user.click(within(confirmation).getByRole("button", { name: "Annuler" }));

      await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
      expect(CheckinService.remove).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
