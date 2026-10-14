import { screen, within } from "@testing-library/react";
import { afterEach } from "vitest";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { ReviewEntry } from "@/pages/beerDetail/components/elements/reviewEntry/reviewEntry";
import i18n from "@/i18n/i18n";
import type { Review } from "@/types/models/review/review";

const BARE_REVIEW: Review = {
  id: 5,
  beerId: 7,
  authorId: 2,
  authorName: "bob",
  authorAvatarColor: "#10B981",
  rating: 3.5,
  text: "",
  sweetness: null,
  acidity: null,
  body: null,
  createdAt: "2026-10-10T12:00:00.000Z",
  updatedAt: "2026-10-12T12:00:00.000Z",
  isMine: false,
};

const renderEntry = (review: Review) =>
  renderWithProviders(
    <ul>
      <ReviewEntry review={review} />
    </ul>,
  );

const getEntry = () => screen.getAllByRole("listitem")[0];

describe("ReviewEntry", () => {
  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("renders a list item with the author initial, the name, the stars and the date of the last update", async () => {
    const { container } = renderEntry(BARE_REVIEW);

    const item = getEntry();
    expect(within(item).getByText("bob")).toBeInTheDocument();
    expect(within(item).getByText("B")).toBeInTheDocument();
    expect(within(item).getByText("3,5 sur 5")).toHaveClass("sr-only");
    const states = Array.from(container.querySelectorAll("[data-state]")).map((star) => star.getAttribute("data-state"));
    expect(states).toEqual(["full", "full", "full", "half", "empty"]);
    expect(within(item).getByText("12/10/2026")).toBeInTheDocument();
    expect(within(item).queryByText("10/10/2026")).not.toBeInTheDocument();
  });

  it("shows only the author, the stars and the date for a review without text and without criterion", async () => {
    const { container } = renderEntry(BARE_REVIEW);

    const item = getEntry();
    expect(item.textContent).toBe("Bbob3,5 sur 512/10/2026");
    expect(container.querySelector("p")).toBeNull();
    expect(within(item).queryByRole("list")).not.toBeInTheDocument();
    expect(within(item).queryByText("Mon avis")).not.toBeInTheDocument();
  });

  it("shows the Mon avis chip only on the review of the current user", async () => {
    const mine = renderEntry({ ...BARE_REVIEW, isMine: true });
    expect(screen.getByText("Mon avis")).toBeInTheDocument();
    mine.unmount();

    renderEntry(BARE_REVIEW);
    expect(screen.queryByText("Mon avis")).not.toBeInTheDocument();
  });

  it("renders the text keeping its line breaks and wrapping long words", async () => {
    renderEntry({ ...BARE_REVIEW, text: "Première ligne\nSeconde ligne" });

    const text = screen.getByText(/Première ligne/);
    expect(text.textContent).toBe("Première ligne\nSeconde ligne");
    expect(text).toHaveClass("whitespace-pre-line");
    expect(text).toHaveClass("break-words");
  });

  it("reads each filled criterion with the label of its level, in the sweetness, acidity, body order", async () => {
    renderEntry({ ...BARE_REVIEW, sweetness: 2, acidity: null, body: 5 });

    const criteria = within(getEntry()).getByRole("list");
    expect(within(criteria).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Douceur : Sèche",
      "Corps : Très plein",
    ]);
  });

  it("reads a criterion at its first and last level", async () => {
    renderEntry({ ...BARE_REVIEW, sweetness: 1, acidity: 5, body: 3 });

    const criteria = within(getEntry()).getByRole("list");
    expect(within(criteria).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Douceur : Très sèche",
      "Acidité : Très vive",
      "Corps : Moyen",
    ]);
  });

  it("keeps a long unbroken author name inside a shrinkable flex child", async () => {
    const longName = "B".repeat(100);

    renderEntry({ ...BARE_REVIEW, authorName: longName });

    const name = screen.getByText(longName);
    expect(name).toHaveClass("break-words");
    expect(name).toHaveClass("min-w-0");
  });

  it("renders the rating and the chip in English", async () => {
    await i18n.changeLanguage("en");
    renderEntry({ ...BARE_REVIEW, isMine: true, rating: 4.5, sweetness: 2 });

    expect(screen.getByText("My review")).toBeInTheDocument();
    expect(screen.getByText("4.5 out of 5")).toBeInTheDocument();
    expect(screen.getByText("Sweetness: Dry")).toBeInTheDocument();
  });
});
