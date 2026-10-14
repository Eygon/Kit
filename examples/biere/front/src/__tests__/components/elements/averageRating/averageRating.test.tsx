import { screen } from "@testing-library/react";
import { AverageRating } from "@/components/elements/averageRating/averageRating";
import i18n from "@/i18n/i18n";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const renderRating = (averageRating: number | null, reviewCount: number) =>
  renderWithProviders(<AverageRating averageRating={averageRating} reviewCount={reviewCount} />);

describe("AverageRating", () => {
  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("shows the average and the count in French, with a full spoken sentence", () => {
    const { container } = renderRating(4.2, 18);

    expect(container.querySelector('p svg[aria-hidden="true"]')).toBeInTheDocument();
    expect(screen.getByText("4,2 (18)")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Note moyenne 4,2 sur 5, 18 avis")).toHaveClass("sr-only");
    expect(screen.queryByText("Aucun avis")).not.toBeInTheDocument();
  });

  it("keeps the rating from overflowing its container", () => {
    renderRating(4.2, 18);

    expect(screen.getByText("4,2 (18)")).toHaveClass("truncate");
    expect(screen.getByText("4,2 (18)").parentElement).toHaveClass("min-w-0");
  });

  it("truncates the No reviews text instead of overflowing", () => {
    renderRating(null, 0);

    expect(screen.getByText("Aucun avis")).toHaveClass("truncate");
  });

  it("shows the average with a decimal point in English", async () => {
    await i18n.changeLanguage("en");
    renderRating(4.2, 18);

    expect(screen.getByText("4.2 (18)")).toBeInTheDocument();
    expect(screen.getByText("Average rating 4.2 out of 5, 18 reviews")).toBeInTheDocument();
  });

  it("keeps one decimal for a whole average", () => {
    renderRating(4, 3);

    expect(screen.getByText("4,0 (3)")).toBeInTheDocument();
    expect(screen.getByText("Note moyenne 4,0 sur 5, 3 avis")).toBeInTheDocument();
  });

  it("uses the singular for a single review", async () => {
    renderRating(5, 1);

    expect(screen.getByText("Note moyenne 5,0 sur 5, 1 avis")).toBeInTheDocument();
    await i18n.changeLanguage("en");
    expect(screen.getByText("Average rating 5.0 out of 5, 1 review")).toBeInTheDocument();
  });

  it("shows a muted No reviews text when there is no average", () => {
    const { container } = renderRating(null, 0);

    expect(container.querySelector("svg")).not.toBeInTheDocument();
    expect(screen.getByText("Aucun avis")).toHaveClass("text-muted");
    expect(screen.queryByText(/Note moyenne/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\(0\)/)).not.toBeInTheDocument();
  });

  it("shows No reviews in English", async () => {
    await i18n.changeLanguage("en");
    renderRating(null, 0);

    expect(screen.getByText("No reviews")).toBeInTheDocument();
  });
});
