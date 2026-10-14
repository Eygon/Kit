import { screen, within } from "@testing-library/react";
import { FeedCard } from "@/pages/home/components/elements/feedCard/feedCard";
import { getAvatarArtwork } from "@/components/elements/userAvatar/utils/avatarArtworks";
import i18n from "@/i18n/i18n";
import { PHOTO_BY_ID } from "@/utils/apiURL/apiURL";
import { FeedItemKindEnum, isFeedItemKind } from "@/types/enums/feed/feedItemKindEnum";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { LEVEL_TITLE_LABEL_KEYS, LevelTitleEnum, isLevelTitle } from "@/types/enums/user/levelTitleEnum";
import type { FeedItem } from "@/types/models/feed/feedItem";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const NOW = new Date("2026-10-14T12:00:00.000Z");
const TWO_HOURS_AGO = "2026-10-14T10:00:00.000Z";

const bobItem: FeedItem = {
  id: "checkin-9",
  kind: FeedItemKindEnum.CHECKIN,
  occurredAt: TWO_HOURS_AGO,
  actor: { id: 2, displayName: "Bob", avatar: AvatarEnum.GLASS, level: 2, title: LevelTitleEnum.TASTER },
  beerId: 7,
  beerName: "Orval",
  place: "La Fine Mousse",
  rating: 4,
  photoId: "photo-1",
  isDiscovery: true,
  discoveryCount: null,
  reachedLevel: null,
  reachedTitle: null,
  reviewText: null,
};

const renderCard = async (overrides: Partial<FeedItem> = {}, now = NOW) => {
  return renderWithProviders(<FeedCard item={{ ...bobItem, ...overrides }} now={now} />);
};

afterEach(async () => {
  await i18n.changeLanguage("fr");
});

describe("FeedCard", () => {
  it("shows the actor, level, relative time, beer, place, rating, photo and discovery stamp", async () => {
    await renderCard();

    expect(screen.getByRole("link", { name: "Bob" })).toHaveAttribute("href", "/profils/2");
    expect(screen.getByText("Niv. 2 · Dégustateur")).toBeInTheDocument();
    expect(screen.getByText("il y a 2 h")).toBeInTheDocument();
    expect(screen.getByText(/a bu/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Orval" })).toHaveAttribute("href", "/bieres/7");
    expect(screen.getByText("La Fine Mousse")).toBeInTheDocument();
    expect(screen.getByText("4 / 5")).toBeInTheDocument();
    expect(screen.getByText("Note 4 sur 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agrandir la photo" })).toBeInTheDocument();
    expect(screen.getByText("Nouvelle découverte")).toBeInTheDocument();
  });

  it("underlines the beer link placed in the sentence of a tasting so it does not rely on colour alone", async () => {
    await renderCard();

    const link = screen.getByRole("link", { name: "Orval" });
    expect(link).toHaveClass("underline");
    expect(link).toHaveClass("underline-offset-2");
  });

  it("underlines the beer link placed in the sentence of a review", async () => {
    await renderCard({ kind: FeedItemKindEnum.REVIEW, reviewText: "Super" });

    const link = screen.getByRole("link", { name: "Orval" });
    expect(link).toHaveClass("underline");
    expect(link).toHaveClass("underline-offset-2");
  });

  it("does not underline the actor link that stands on its own line", async () => {
    await renderCard();

    expect(screen.getByRole("link", { name: "Bob" })).not.toHaveClass("underline");
  });

  it("keeps the avatar decorative so the name is not announced twice", async () => {
    await renderCard();

    expect(screen.queryByRole("img", { name: /Avatar/ })).not.toBeInTheDocument();
  });

  it("draws the actor avatar in the header, hidden from screen readers", async () => {
    await renderCard();

    const header = screen.getByRole("link", { name: "Bob" }).closest("li")?.firstElementChild as HTMLElement;
    const svg = header.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    const paths = Array.from(svg?.querySelectorAll("path") ?? []);
    expect(paths.map((path) => path.getAttribute("d"))).toEqual(getAvatarArtwork(AvatarEnum.GLASS).shapes.map((shape) => shape.d));
  });

  it("draws the avatar of the actor whoever it is", async () => {
    await renderCard({ actor: { ...bobItem.actor, avatar: AvatarEnum.HOP } });

    const paths = Array.from(screen.getByRole("listitem").querySelectorAll("svg path"));
    expect(paths.map((path) => path.getAttribute("d"))).toEqual(getAvatarArtwork(AvatarEnum.HOP).shapes.map((shape) => shape.d));
  });

  it("shows the thumbnail of the tasting photo", async () => {
    await renderCard();

    const thumbnail = screen.getByRole("button", { name: "Agrandir la photo" }).querySelector("img");
    expect(thumbnail).toHaveAttribute("src", PHOTO_BY_ID("photo-1"));
  });

  it("exposes the time as a machine readable date", async () => {
    await renderCard();

    expect(screen.getByText("il y a 2 h").closest("time")).toHaveAttribute("datetime", TWO_HOURS_AGO);
  });

  it("shows neither rating nor photo nor stamp for a plain tasting", async () => {
    await renderCard({ rating: null, photoId: null, isDiscovery: false });

    expect(screen.queryByText(/\/ 5/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Note .* sur 5/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agrandir la photo" })).not.toBeInTheDocument();
    expect(screen.queryByText("Nouvelle découverte")).not.toBeInTheDocument();
  });

  it("keeps a rating of zero", async () => {
    await renderCard({ rating: 0 });

    expect(screen.getByText("0 / 5")).toBeInTheDocument();
  });

  it("omits the place when there is none", async () => {
    await renderCard({ place: null });

    expect(screen.queryByText("La Fine Mousse")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Orval" })).toBeInTheDocument();
  });

  it("says just now under one minute", async () => {
    await renderCard({ occurredAt: "2026-10-14T11:59:40.000Z" });

    expect(screen.getByText("à l'instant")).toBeInTheDocument();
  });

  it("writes the short date beyond seven days", async () => {
    await renderCard({ occurredAt: "2026-10-06T11:00:00.000Z" });

    expect(screen.getByText("06/10/2026")).toBeInTheDocument();
  });

  it("speaks English when the language changes", async () => {
    await i18n.changeLanguage("en");
    await renderCard();

    expect(screen.getByText("2 hr. ago")).toBeInTheDocument();
    expect(screen.getByText("Lvl 2 · Taster")).toBeInTheDocument();
    expect(screen.getByText(/drank/)).toBeInTheDocument();
    expect(screen.getByText("Rated 4 out of 5")).toBeInTheDocument();
    expect(screen.getByText("New discovery")).toBeInTheDocument();
  });

  it("wraps a very long beer name and place instead of overflowing", async () => {
    const longBeer = "Brasserie-Artisanale-du-Mont-Blanc-Triple-Reserve-Speciale-Edition-Limitee";
    const longPlace = "Le-Comptoir-des-Brasseurs-Independants-de-la-Vallee-de-la-Meuse-et-des-Ardennes";
    await renderCard({ beerName: longBeer, place: longPlace });

    expect(screen.getByRole("link", { name: longBeer }).className).toContain("break-words");
    expect(screen.getByText(longPlace).className).toContain("break-words");
    expect(screen.getByRole("listitem").className).toContain("min-w-0");
  });

  it("wraps a very long actor name and gives its link a 44 px target", async () => {
    const longName = "Bob-le-Brasseur-Itinerant-des-Hautes-Terres-Mousseuses";
    await renderCard({ actor: { ...bobItem.actor, displayName: longName } });

    const link = screen.getByRole("link", { name: longName });
    expect(link.className).toContain("break-words");
    expect(link.className).toContain("min-h-11");
  });

  it("links the beer with a 44 px target", async () => {
    await renderCard();

    expect(screen.getByRole("link", { name: "Orval" }).className).toContain("min-h-11");
  });

  it("renders nothing about a drink for a non tasting item", async () => {
    await renderCard({ kind: FeedItemKindEnum.LEVEL_UP, beerId: null, beerName: null, place: null });

    expect(screen.queryByText(/a bu/)).not.toBeInTheDocument();
    expect(within(screen.getByRole("listitem")).getByRole("link", { name: "Bob" })).toBeInTheDocument();
  });
});

const withoutBeer: Partial<FeedItem> = {
  beerId: null,
  beerName: null,
  place: null,
  rating: null,
  photoId: null,
  isDiscovery: false,
};

describe("FeedCard discoveries", () => {
  const discoveries = (count: number | null): Partial<FeedItem> => ({
    ...withoutBeer,
    kind: FeedItemKindEnum.DISCOVERIES,
    discoveryCount: count,
  });

  it("says three beers were discovered with the plural and keeps the profile link", async () => {
    await renderCard(discoveries(3));

    expect(screen.getByText("a découvert 3 bières")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bob" })).toHaveAttribute("href", "/profils/2");
    expect(screen.queryByText(/a bu/)).not.toBeInTheDocument();
  });

  it("uses the singular for one beer", async () => {
    await renderCard(discoveries(1));

    expect(screen.getByText("a découvert 1 bière")).toBeInTheDocument();
  });

  it("speaks English for the discoveries", async () => {
    await i18n.changeLanguage("en");
    await renderCard(discoveries(3));

    expect(screen.getByText("discovered 3 beers")).toBeInTheDocument();
  });

  it("speaks the English singular for one beer", async () => {
    await i18n.changeLanguage("en");
    await renderCard(discoveries(1));

    expect(screen.getByText("discovered 1 beer")).toBeInTheDocument();
  });

  it("shows no sentence when the count is missing", async () => {
    await renderCard(discoveries(null));

    expect(screen.queryByText(/découvert/)).not.toBeInTheDocument();
  });
});

describe("FeedCard level up", () => {
  const levelUp: Partial<FeedItem> = {
    ...withoutBeer,
    kind: FeedItemKindEnum.LEVEL_UP,
    reachedLevel: 3,
    reachedTitle: LevelTitleEnum.HOP_HEAD,
  };

  it("announces the level and title with a level badge", async () => {
    await renderCard(levelUp);

    expect(screen.getByText("passe niveau 3 — Houblonneur")).toBeInTheDocument();
    const badge = screen.getByText("Niv. 3 · Houblonneur", { selector: "span.rounded-full" });
    expect(badge.className).toContain("bg-highlight");
    expect(badge.className).toContain("border-mousse");
    expect(badge.className).toContain("font-display");
    expect(badge.className).toContain("text-highlight-foreground");
  });

  it("speaks English for the level up", async () => {
    await i18n.changeLanguage("en");
    await renderCard(levelUp);

    expect(screen.getByText("reached level 3 — Hop head")).toBeInTheDocument();
  });

  it("shows no sentence and no badge without a reached level", async () => {
    await renderCard({ ...levelUp, reachedLevel: null });

    expect(screen.queryByText(/passe niveau/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Niv\. 3/)).not.toBeInTheDocument();
  });

  it("shows no sentence without a reached title", async () => {
    await renderCard({ ...levelUp, reachedTitle: null });

    expect(screen.queryByText(/passe niveau/)).not.toBeInTheDocument();
  });
});

describe("FeedCard review", () => {
  const longText = "Une bière ample et épicée ".repeat(30).trim();
  const review: Partial<FeedItem> = {
    ...withoutBeer,
    kind: FeedItemKindEnum.REVIEW,
    beerId: 7,
    beerName: "Orval",
    rating: 4.5,
    reviewText: longText,
  };

  it("shows the beer link, the rating and a text clamped to three lines", async () => {
    await renderCard(review);

    expect(screen.getByText(/a donné son avis sur/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Orval" })).toHaveAttribute("href", "/bieres/7");
    expect(screen.getByText("4,5")).toBeInTheDocument();
    expect(screen.getByText("Note 4,5 sur 5")).toBeInTheDocument();
    const text = screen.getByText(longText);
    expect(text.className).toContain("line-clamp-3");
    expect(text.className).toContain("break-words");
  });

  it("shows only the rating for a review without text", async () => {
    await renderCard({ ...review, reviewText: "" });

    expect(screen.getByText("4,5")).toBeInTheDocument();
    expect(screen.getByRole("listitem").querySelector(".line-clamp-3")).toBeNull();
  });

  it("shows only the rating when the text is missing", async () => {
    await renderCard({ ...review, reviewText: null });

    expect(screen.getByText("4,5")).toBeInTheDocument();
    expect(screen.getByRole("listitem").querySelector(".line-clamp-3")).toBeNull();
  });

  it("writes the rating with a dot in English", async () => {
    await i18n.changeLanguage("en");
    await renderCard(review);

    expect(screen.getByText(/reviewed/)).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });

  it("keeps a zero rating", async () => {
    await renderCard({ ...review, rating: 0 });

    expect(screen.getByText("0,0")).toBeInTheDocument();
  });

  it("omits the rating when there is none", async () => {
    await renderCard({ ...review, rating: null });

    expect(screen.queryByText(/Note .* sur 5/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Orval" })).toBeInTheDocument();
  });

  it("shows no review sentence without a beer", async () => {
    await renderCard({ ...review, beerId: null, beerName: null });

    expect(screen.queryByText(/a donné son avis/)).not.toBeInTheDocument();
  });

  it("wraps a very long beer name and gives its link a 44 px target", async () => {
    const longBeer = "Brasserie-Artisanale-du-Mont-Blanc-Triple-Reserve-Speciale-Edition-Limitee";
    await renderCard({ ...review, beerName: longBeer });

    const link = screen.getByRole("link", { name: longBeer });
    expect(link.className).toContain("break-words");
    expect(link.className).toContain("min-h-11");
  });
});

describe("FeedCard unknown kind", () => {
  it("renders only the header for a kind it does not handle", async () => {
    await renderCard({ ...withoutBeer, kind: "poke" as FeedItemKindEnum });

    expect(screen.getByRole("link", { name: "Bob" })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByText(/a bu|découvert|passe niveau|avis/)).not.toBeInTheDocument();
  });
});

describe("level titles and feed kinds", () => {
  it("recognises the six level titles and their label keys", () => {
    expect(Object.values(LevelTitleEnum)).toEqual(["curious", "taster", "hopHead", "finePalate", "masterBrewer", "foamLegend"]);
    expect(LEVEL_TITLE_LABEL_KEYS.taster).toBe("level.titles.taster");
    expect(isLevelTitle("foamLegend")).toBe(true);
    expect(isLevelTitle("king")).toBe(false);
    expect(isLevelTitle(3)).toBe(false);
  });

  it("recognises the four feed item kinds", () => {
    expect(Object.values(FeedItemKindEnum)).toEqual(["checkin", "discoveries", "levelUp", "review"]);
    expect(isFeedItemKind("review")).toBe(true);
    expect(isFeedItemKind("poke")).toBe(false);
  });
});
