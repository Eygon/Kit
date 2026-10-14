import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import FeedService from "@/api/feed/feedService";
import { FeedSection } from "@/pages/home/components/widgets/feedSection/feedSection";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { FeedItemKindEnum } from "@/types/enums/feed/feedItemKindEnum";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";
import type { FeedItem } from "@/types/models/feed/feedItem";

vi.mock("@/api/feed/feedService", () => ({
  default: { getPage: vi.fn() },
}));

const TOTAL = 25;
const PAGE_SIZE = 20;

const buildItem = (index: number): FeedItem => ({
  id: `checkin-${index}`,
  kind: FeedItemKindEnum.CHECKIN,
  occurredAt: "2026-10-12T12:00:00.000Z",
  actor: { id: 3, displayName: `Carol ${index}`, avatar: AvatarEnum.GLASS, level: 4, title: LevelTitleEnum.FINE_PALATE },
  beerId: 100 + index,
  beerName: `Bière ${index}`,
  place: null,
  rating: null,
  photoId: null,
  isDiscovery: false,
  discoveryCount: null,
  reachedLevel: null,
  reachedTitle: null,
  reviewText: null,
});

const pageOf = (page: number, total: number) => ({
  items: Array.from({ length: Math.max(0, Math.min(PAGE_SIZE, total - (page - 1) * PAGE_SIZE)) }, (_, index) =>
    buildItem(total - ((page - 1) * PAGE_SIZE + index)),
  ),
  total,
  page,
  size: PAGE_SIZE,
});

const stubPages = (total = TOTAL) => {
  (FeedService.getPage as Mock).mockImplementation(async (page: number) => pageOf(page, total));
};

const cardsCount = () => within(screen.getByRole("list")).getAllByRole("listitem").length;

describe("FeedSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the section heading", async () => {
    stubPages();
    renderWithProviders(<FeedSection />);

    expect(screen.getByRole("heading", { level: 2, name: "Fil d'actualité" })).toBeInTheDocument();
    await screen.findAllByRole("listitem");
  });

  it("shows three card skeletons while the feed loads", () => {
    (FeedService.getPage as Mock).mockReturnValue(new Promise(() => undefined));
    const { container } = renderWithProviders(<FeedSection />);

    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
    expect(busy?.children).toHaveLength(3);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an alert with Réessayer on error and reloads the feed on retry", async () => {
    (FeedService.getPage as Mock).mockRejectedValueOnce(new Error("down"));
    renderWithProviders(<FeedSection />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger le fil");
    stubPages();
    await userEvent.setup().click(within(alert).getByRole("button", { name: "Réessayer" }));

    await waitFor(() => expect(cardsCount()).toBe(20));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(FeedService.getPage).toHaveBeenCalledTimes(2);
    expect(FeedService.getPage).toHaveBeenLastCalledWith(1);
  });

  it("shows the mascot panel and a link to /profils when the feed is empty", async () => {
    stubPages(0);
    const { container } = renderWithProviders(<FeedSection />);

    expect(await screen.findByRole("heading", { name: "Suivez des profils pour voir leurs dégustations" })).toBeInTheDocument();
    expect(screen.getByText("Leurs dégustations, découvertes et avis apparaîtront ici.")).toBeInTheDocument();
    expect(container.querySelector("img[alt=\"\"]")).not.toBeNull();
    expect(container.querySelector('[data-slot="mascot"]')).toHaveAttribute("data-mood", MascotMoodEnum.SEARCHING);
    const link = screen.getByRole("link", { name: "Trouver des profils" });
    expect(link).toHaveAttribute("href", "/profils");
    expect(link.className).toContain("min-h-11");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
  });

  it("lists the first 20 of 25 cards in order with a Voir plus button", async () => {
    stubPages();
    renderWithProviders(<FeedSection />);

    await waitFor(() => expect(cardsCount()).toBe(20));
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Bière 25");
    expect(items[19]).toHaveTextContent("Bière 6");
    expect(screen.getByRole("button", { name: "Voir plus" })).toBeInTheDocument();
  });

  it("adds the 5 next cards under the first 20 and removes the button", async () => {
    stubPages();
    renderWithProviders(<FeedSection />);
    await waitFor(() => expect(cardsCount()).toBe(20));

    await userEvent.setup().click(screen.getByRole("button", { name: "Voir plus" }));

    await waitFor(() => expect(cardsCount()).toBe(25));
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Bière 25");
    expect(items[20]).toHaveTextContent("Bière 5");
    expect(items[24]).toHaveTextContent("Bière 1");
    expect(screen.queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
  });

  it("sends a single request for two clicks in the same tick", async () => {
    stubPages();
    renderWithProviders(<FeedSection />);
    await waitFor(() => expect(cardsCount()).toBe(20));
    const button = screen.getByRole("button", { name: "Voir plus" });

    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(cardsCount()).toBe(25));
    expect(FeedService.getPage).toHaveBeenCalledTimes(2);
    expect((FeedService.getPage as Mock).mock.calls).toEqual([[1], [2]]);
  });

  it("keeps the loaded cards and offers Réessayer when Voir plus fails, then loads the rest", async () => {
    stubPages();
    renderWithProviders(<FeedSection />);
    await waitFor(() => expect(cardsCount()).toBe(20));
    (FeedService.getPage as Mock).mockRejectedValueOnce(new Error("down"));

    await userEvent.setup().click(screen.getByRole("button", { name: "Voir plus" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger le fil");
    expect(cardsCount()).toBe(20);

    await userEvent.setup().click(within(alert).getByRole("button", { name: "Réessayer" }));

    await waitFor(() => expect(cardsCount()).toBe(25));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("freezes the relative time at the first render", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-10-12T14:00:00.000Z"));
      stubPages();
      renderWithProviders(<FeedSection />);
      await waitFor(() => expect(cardsCount()).toBe(20));
      const firstCard = within(screen.getByRole("list")).getAllByRole("listitem")[0] as HTMLElement;
      expect(within(firstCard).getByText("il y a 2 h")).toHaveAttribute("datetime", "2026-10-12T12:00:00.000Z");

      vi.setSystemTime(new Date("2026-10-12T17:00:00.000Z"));
      await userEvent.setup().click(screen.getByRole("button", { name: "Voir plus" }));
      await waitFor(() => expect(cardsCount()).toBe(25));

      const cards = within(screen.getByRole("list")).getAllByRole("listitem");
      expect(within(cards[0] as HTMLElement).getByText("il y a 2 h")).toBeInTheDocument();
      expect(within(cards[24] as HTMLElement).getByText("il y a 2 h")).toBeInTheDocument();
      expect(screen.queryByText("il y a 5 h")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("puts the Voir plus button in its pending state while the next page loads", async () => {
    stubPages();
    renderWithProviders(<FeedSection />);
    await waitFor(() => expect(cardsCount()).toBe(20));
    const button = screen.getByRole("button", { name: "Voir plus" });
    expect(button).not.toHaveAttribute("data-pending");
    let release: () => void = () => undefined;
    (FeedService.getPage as Mock).mockImplementationOnce(
      (page: number) =>
        new Promise((resolve) => {
          release = () => resolve(pageOf(page, TOTAL));
        }),
    );

    await userEvent.setup().click(button);

    await waitFor(() => expect(screen.getByRole("button", { name: /Voir plus/ })).toHaveAttribute("data-pending", "true"));
    release();
    await waitFor(() => expect(cardsCount()).toBe(25));
  });

  it("speaks English when the language is English", async () => {
    const { default: i18n } = await import("@/i18n/i18n");
    await i18n.changeLanguage("en");
    try {
      stubPages(0);
      renderWithProviders(<FeedSection />);

      expect(await screen.findByRole("heading", { name: "Follow profiles to see their tastings" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "Activity feed" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Find profiles" })).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage("fr");
    }
  });
});
