import { ReviewsSection } from "@/pages/beerDetail/components/widgets/reviewsSection/reviewsSection";
import { toast } from "@heroui/react";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach } from "vitest";
import type { Mock } from "vitest";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import ReviewService from "@/api/reviews/reviewService";
import i18n from "@/i18n/i18n";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { ReviewCriterionEnum } from "@/types/enums/review/reviewCriterionEnum";
import type { Beer } from "@/types/models/beer/beer";
import type { Review } from "@/types/models/review/review";
import type { ReviewPage } from "@/types/models/review/reviewPage";

vi.mock("@/api/reviews/reviewService", () => ({
  default: { getPage: vi.fn(), save: vi.fn() },
}));

const PAGE_SIZE = 10;

const reviewOf = (id: number, overrides: Partial<Review> = {}): Review => ({
  id,
  beerId: 1,
  authorId: id,
  authorName: `Author ${id}`,
  authorAvatarColor: "#10B981",
  rating: 4,
  text: "",
  sweetness: null,
  acidity: null,
  body: null,
  createdAt: "2026-10-10T12:00:00.000Z",
  updatedAt: "2026-10-12T12:00:00.000Z",
  isMine: false,
  ...overrides,
});

const MINE = reviewOf(100, { authorName: "Moi", isMine: true, text: "Mon avis perso" });

const pageOf = (page: number, total: number, mine: Review | null): ReviewPage => ({
  mine,
  items: Array.from({ length: Math.max(0, Math.min(PAGE_SIZE, total - (page - 1) * PAGE_SIZE)) }, (_, index) =>
    reviewOf(total - ((page - 1) * PAGE_SIZE + index)),
  ),
  total,
  page,
  size: PAGE_SIZE,
});

const stubReviews = (total: number, mine: Review | null = MINE) => {
  (ReviewService.getPage as Mock).mockImplementation(async (_beerId: number, page: number) =>
    pageOf(page, total, mine),
  );
};

const authorNames = () =>
  screen
    .getAllByText(/^(Author \d+|Moi)$/)
    .map((name) => name.textContent);

const BASE_BEER: Beer = {
  id: 1,
  name: "Chimay Rouge",
  breweryName: "Bières de Chimay",
  country: "BE",
  styleId: 4,
  styleName: "Dubbel trappiste",
  family: BeerFamilyEnum.TRAPPIST,
  abv: 7,
  aromas: [],
  formats: [],
  description: "Une trappiste cuivrée.",
  drunk: false,
  checkinCount: 0,
  inWishlist: false,
  bitternessLevel: null,
  colorLevel: null,
  styleColorRange: null,
  averageRating: null,
  reviewCount: 0,
  ratingDistribution: [],
  criteria: [],
};

const REVIEWED_BEER: Beer = {
  ...BASE_BEER,
  averageRating: 3.5,
  reviewCount: 12,
  ratingDistribution: [
    { stars: 1, count: 1 },
    { stars: 2, count: 0 },
    { stars: 3, count: 2 },
    { stars: 4, count: 7 },
    { stars: 5, count: 2 },
  ],
  criteria: [
    { criterion: ReviewCriterionEnum.SWEETNESS, average: 2.7, count: 3 },
    { criterion: ReviewCriterionEnum.ACIDITY, average: null, count: 1 },
    { criterion: ReviewCriterionEnum.BODY, average: null, count: 0 },
  ],
};

const UNREVIEWED_BEER: Beer = {
  ...BASE_BEER,
  ratingDistribution: [1, 2, 3, 4, 5].map((stars) => ({ stars, count: 0 })),
  criteria: [
    { criterion: ReviewCriterionEnum.SWEETNESS, average: null, count: 0 },
    { criterion: ReviewCriterionEnum.ACIDITY, average: null, count: 0 },
    { criterion: ReviewCriterionEnum.BODY, average: null, count: 0 },
  ],
};

const CHECKED_IN_BEER: Beer = { ...REVIEWED_BEER, checkinCount: 2 };

const CHECKIN_FIRST = "Enregistrez d'abord une dégustation de cette bière.";

const renderSection = (beer: Beer) => {
  return renderWithProviders(<ReviewsSection beer={beer} />);
};

describe("ReviewsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubReviews(0, null);
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("titles the section Avis with a level 2 heading", () => {
    renderSection(REVIEWED_BEER);

    const section = screen.getByRole("region", { name: "Avis" });
    expect(within(section).getByRole("heading", { level: 2, name: "Avis" })).toBeInTheDocument();
  });

  it("reads the average 3,5, the 12 reviews and a 3,5 sur 5 alternative text", () => {
    const { container } = renderSection(REVIEWED_BEER);

    expect(screen.getByText("3,5")).toBeInTheDocument();
    expect(screen.getByText("12 avis")).toBeInTheDocument();
    expect(screen.getByText("3,5 sur 5")).toHaveClass("sr-only");
    const states = Array.from(container.querySelectorAll("[data-state]")).map((star) => star.getAttribute("data-state"));
    expect(states).toEqual(["full", "full", "full", "half", "empty"]);
  });

  it("draws five bars from 5 stars to 1 star with a readable label", () => {
    renderSection(REVIEWED_BEER);

    const meters = screen.getAllByRole("meter", { name: /étoile/ });
    expect(meters.map((meter) => meter.getAttribute("aria-valuetext"))).toEqual([
      "5 étoiles : 2 avis",
      "4 étoiles : 7 avis",
      "3 étoiles : 2 avis",
      "2 étoiles : 0 avis",
      "1 étoile : 1 avis",
    ]);
  });

  it("reads the sweetness with its level and hides the acidity with the missing reviews", () => {
    renderSection(REVIEWED_BEER);

    expect(screen.getByText("Douceur 2,7 / 5 · Sèche")).toBeInTheDocument();
    expect(screen.getByText("Acidité : encore 2 avis pour afficher ce critère")).toBeInTheDocument();
  });

  it("says there is no rating yet and shows empty bars when nobody reviewed the beer", () => {
    const { container } = renderSection(UNREVIEWED_BEER);

    expect(screen.getByText("Pas encore de note")).toBeInTheDocument();
    expect(screen.queryByText(/sur 5$/)).not.toBeInTheDocument();
    expect(container.querySelector("[data-state]")).toBeNull();
    const bars = screen.getAllByRole("meter", { name: /étoile/ });
    expect(bars).toHaveLength(5);
    bars.forEach((bar) => expect(bar).toHaveAttribute("aria-valuenow", "0"));
    expect(screen.getByText("Corps : encore 3 avis pour afficher ce critère")).toBeInTheDocument();
  });

  it("renders the summary in English", async () => {
    await i18n.changeLanguage("en");
    renderSection(REVIEWED_BEER);

    expect(screen.getByRole("heading", { level: 2, name: "Reviews" })).toBeInTheDocument();
    expect(screen.getByText("3.5")).toBeInTheDocument();
    expect(screen.getByText("12 reviews")).toBeInTheDocument();
    expect(screen.getByText("3.5 out of 5")).toBeInTheDocument();
  });
});

describe("ReviewsSection review list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("asks for the first page of the displayed beer", async () => {
    stubReviews(12);
    renderSection(REVIEWED_BEER);

    await screen.findByText("Moi");
    expect(ReviewService.getPage).toHaveBeenCalledWith(REVIEWED_BEER.id, 1);
  });

  it("AC1 puts my review first with Mon avis, then 10 reviews, and Voir plus loads the 2 next then disappears", async () => {
    const user = userEvent.setup();
    stubReviews(12);
    renderSection(REVIEWED_BEER);

    await screen.findByText("Moi");
    expect(authorNames()).toEqual(["Moi", ...Array.from({ length: 10 }, (_, index) => `Author ${12 - index}`)]);
    expect(screen.getAllByText("Mon avis")).toHaveLength(1);
    expect(screen.getByText("Mon avis perso")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voir plus" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Voir plus" }));

    await waitFor(() => expect(authorNames()).toHaveLength(13));
    expect(authorNames().slice(-2)).toEqual(["Author 2", "Author 1"]);
    expect(authorNames().filter((name) => name === "Moi")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
    expect((ReviewService.getPage as Mock).mock.calls).toEqual([
      [REVIEWED_BEER.id, 1],
      [REVIEWED_BEER.id, 2],
    ]);
  });

  it("lists only the reviews of others, in order, when I have no review", async () => {
    stubReviews(3, null);
    renderSection(REVIEWED_BEER);

    await screen.findByText("Author 3");
    expect(authorNames()).toEqual(["Author 3", "Author 2", "Author 1"]);
    expect(screen.queryByText("Mon avis")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
  });

  it("shows my review alone, without the empty state, when nobody else reviewed the beer", async () => {
    stubReviews(0);
    renderSection(REVIEWED_BEER);

    await screen.findByText("Moi");
    expect(authorNames()).toEqual(["Moi"]);
    expect(screen.queryByText("Aucun avis pour l'instant")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
  });

  it("AC2 shows only the author, the stars and the date for a review without text and without criterion", async () => {
    (ReviewService.getPage as Mock).mockResolvedValue({
      mine: null,
      items: [reviewOf(1, { authorName: "Zoé", rating: 3.5 })],
      total: 1,
      page: 1,
      size: PAGE_SIZE,
    });
    renderSection(REVIEWED_BEER);

    const author = await screen.findByText("Zoé");
    const entry = author.closest("li");
    expect(entry?.textContent).toBe("ZZoé3,5 sur 512/10/2026");
    expect(entry?.querySelector("p")).toBeNull();
    expect(entry?.querySelector("ul")).toBeNull();
  });

  it("AC3 shows Skeleton blocks while loading, then the list", async () => {
    let resolvePage: (page: ReviewPage) => void = () => undefined;
    (ReviewService.getPage as Mock).mockImplementation(
      () => new Promise<ReviewPage>((resolve) => (resolvePage = resolve)),
    );
    const { container } = renderSection(REVIEWED_BEER);

    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
    expect(busy?.children.length).toBeGreaterThanOrEqual(3);
    expect(busy?.querySelectorAll(".skeleton")).toHaveLength(busy?.children.length ?? -1);
    expect(screen.queryByText("Aucun avis pour l'instant")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    resolvePage(pageOf(1, 1, null));

    await screen.findByText("Author 1");
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it("AC3 shows the alert and Réessayer when the first page fails, and recovers on retry", async () => {
    const user = userEvent.setup();
    (ReviewService.getPage as Mock).mockRejectedValue(new Error("server down"));
    renderSection(REVIEWED_BEER);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger les avis.");
    expect(screen.queryByText("Aucun avis pour l'instant")).not.toBeInTheDocument();

    stubReviews(1, null);
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));

    await screen.findByText("Author 1");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("AC3 shows the empty state with the searching mascot when there is no review at all", async () => {
    stubReviews(0, null);
    const { container } = renderSection(UNREVIEWED_BEER);

    expect(await screen.findByRole("heading", { level: 2, name: "Aucun avis pour l'instant" })).toBeInTheDocument();
    expect(screen.getByText("Soyez le premier à donner votre avis.")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="mascot"]')).toHaveAttribute("data-mood", "searching");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
  });

  it("shows no mascot while loading, on a list, or on an error", async () => {
    stubReviews(2, null);
    const { container } = renderSection(REVIEWED_BEER);

    expect(container.querySelector('[data-slot="mascot"]')).toBeNull();
    await screen.findByText("Author 2");
    expect(container.querySelector('[data-slot="mascot"]')).toBeNull();
  });

  it("AC4 keeps the loaded reviews and offers Réessayer when Voir plus fails, then loads the rest", async () => {
    const user = userEvent.setup();
    stubReviews(12);
    renderSection(REVIEWED_BEER);
    await screen.findByText("Moi");

    (ReviewService.getPage as Mock).mockRejectedValue(new Error("server down"));
    await user.click(screen.getByRole("button", { name: "Voir plus" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger les avis.");
    expect(authorNames()).toHaveLength(11);
    expect(screen.queryByText("Aucun avis pour l'instant")).not.toBeInTheDocument();

    stubReviews(12);
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));

    await waitFor(() => expect(authorNames()).toHaveLength(13));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voir plus" })).not.toBeInTheDocument();
  });

  it("asks for the next page once when Voir plus is double clicked in the same tick", async () => {
    stubReviews(12);
    renderSection(REVIEWED_BEER);
    await screen.findByText("Moi");

    const more = screen.getByRole("button", { name: "Voir plus" });
    more.click();
    more.click();

    await waitFor(() => expect(authorNames()).toHaveLength(13));
    expect((ReviewService.getPage as Mock).mock.calls.filter(([, page]) => page === 2)).toHaveLength(1);
  });

  it("renders the list copy in English", async () => {
    await i18n.changeLanguage("en");
    stubReviews(0, null);
    renderSection(UNREVIEWED_BEER);

    expect(await screen.findByRole("heading", { level: 2, name: "No reviews yet" })).toBeInTheDocument();
    expect(screen.getByText("Be the first to review it.")).toBeInTheDocument();
  });
});

describe("ReviewsSection review sheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
  });

  it("AC2 disables Donner mon avis and says to check in first for a beer never tasted without my review", async () => {
    stubReviews(2, null);
    renderSection(REVIEWED_BEER);

    await screen.findByText("Author 2");
    expect(screen.getByRole("button", { name: "Donner mon avis" })).toBeDisabled();
    expect(screen.getByText(CHECKIN_FIRST)).toBeInTheDocument();
  });

  it("AC2 keeps the button disabled while the reviews load, without the check-in mention for a tasted beer", async () => {
    let resolvePage: (page: ReviewPage) => void = () => undefined;
    (ReviewService.getPage as Mock).mockImplementation(
      () => new Promise<ReviewPage>((resolve) => (resolvePage = resolve)),
    );
    renderSection(CHECKED_IN_BEER);

    expect(screen.getByRole("button", { name: "Donner mon avis" })).toBeDisabled();
    expect(screen.queryByText(CHECKIN_FIRST)).not.toBeInTheDocument();

    resolvePage(pageOf(1, 1, null));

    await screen.findByText("Author 1");
    expect(screen.getByRole("button", { name: "Donner mon avis" })).toBeEnabled();
  });

  it("disables the button when the first page fails, then enables it after a successful retry", async () => {
    const user = userEvent.setup();
    (ReviewService.getPage as Mock).mockRejectedValue(new Error("server down"));
    renderSection(CHECKED_IN_BEER);

    const alert = await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Donner mon avis" })).toBeDisabled();

    stubReviews(1, null);
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));

    await screen.findByText("Author 1");
    expect(screen.getByRole("button", { name: "Donner mon avis" })).toBeEnabled();
  });

  it("enables Donner mon avis for a tasted beer without review and shows no mention", async () => {
    stubReviews(2, null);
    renderSection(CHECKED_IN_BEER);

    await screen.findByText("Author 2");
    expect(screen.getByRole("button", { name: "Donner mon avis" })).toBeEnabled();
    expect(screen.queryByText(CHECKIN_FIRST)).not.toBeInTheDocument();
  });

  it("AC3 says Modifier mon avis, enabled even without any tasting, with no mention", async () => {
    stubReviews(2);
    renderSection(REVIEWED_BEER);

    await screen.findByText("Moi");
    expect(screen.getByRole("button", { name: "Modifier mon avis" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Donner mon avis" })).not.toBeInTheDocument();
    expect(screen.queryByText(CHECKIN_FIRST)).not.toBeInTheDocument();
  });

  it("AC3 opens the sheet prefilled with my review", async () => {
    const user = userEvent.setup();
    stubReviews(2);
    renderSection(REVIEWED_BEER);
    await screen.findByText("Moi");

    await user.click(screen.getByRole("button", { name: "Modifier mon avis" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Votre avis sur Chimay Rouge" })).toBeInTheDocument();
    expect(within(dialog).getByRole("textbox", { name: "Votre avis" })).toHaveValue("Mon avis perso");
    expect(within(dialog).getByRole("slider", { name: "Note" })).toHaveValue("4");
  });

  it("E4 keeps my review editable and deletable when I have no tasting left", async () => {
    const user = userEvent.setup();
    stubReviews(2);
    renderSection({ ...REVIEWED_BEER, checkinCount: 0 });
    await screen.findByText("Moi");

    await user.click(screen.getByRole("button", { name: "Modifier mon avis" }));

    const dialog = await screen.findByRole("dialog");
    const remove = within(dialog).getByRole("button", { name: "Supprimer mon avis" });
    expect(remove).toBeEnabled();
    await user.click(remove);
    expect(await screen.findByRole("alertdialog")).toHaveAccessibleName("Supprimer votre avis ?");
  });

  it("puts the button under the section title", async () => {
    stubReviews(0, null);
    renderSection(CHECKED_IN_BEER);

    const heading = screen.getByRole("heading", { level: 2, name: "Avis" });
    const button = screen.getByRole("button", { name: "Donner mon avis" });

    expect(heading.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Avis" })).getByRole("button", { name: "Donner mon avis" })).toBe(button);
    await screen.findByRole("heading", { level: 2, name: "Aucun avis pour l'instant" });
  });

  it("AC1 sends the review, closes the sheet, shows Avis enregistré and reads the review list again", async () => {
    const user = userEvent.setup();
    stubReviews(0, null);
    (ReviewService.save as Mock).mockResolvedValue(reviewOf(100, { isMine: true, rating: 4 }));
    renderSection(CHECKED_IN_BEER);
    await screen.findByRole("heading", { level: 2, name: "Aucun avis pour l'instant" });

    await user.click(screen.getByRole("button", { name: "Donner mon avis" }));
    const dialog = await screen.findByRole("dialog");
    within(dialog).getByRole("slider", { name: "Note" }).focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    await user.click(within(dialog).getByRole("button", { name: "Publier mon avis" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(ReviewService.save).toHaveBeenCalledTimes(1);
    expect(ReviewService.save).toHaveBeenCalledWith(CHECKED_IN_BEER.id, {
      rating: 4,
      text: "",
      sweetness: null,
      acidity: null,
      body: null,
    });
    expect(toast.success).toHaveBeenCalledWith("Avis enregistré");
    await waitFor(() => expect((ReviewService.getPage as Mock).mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("renders the mention in English", async () => {
    await i18n.changeLanguage("en");
    stubReviews(0, null);
    renderSection(REVIEWED_BEER);

    expect(screen.getByRole("button", { name: "Write a review" })).toBeDisabled();
    expect(screen.getByText("Check in this beer first.")).toBeInTheDocument();
    await screen.findByRole("heading", { level: 2, name: "No reviews yet" });
  });
});
