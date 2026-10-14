import { RatingHistogram } from "@/pages/beerDetail/components/elements/ratingHistogram/ratingHistogram";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import type { RatingBucket } from "@/types/models/beer/ratingBucket";

const DISTRIBUTION: RatingBucket[] = [
  { stars: 1, count: 1 },
  { stars: 2, count: 0 },
  { stars: 3, count: 2 },
  { stars: 4, count: 7 },
  { stars: 5, count: 2 },
];

const renderHistogram = (distribution: RatingBucket[], reviewCount: number) => {
  return renderWithProviders(<RatingHistogram distribution={distribution} reviewCount={reviewCount} />);
};

describe("RatingHistogram", () => {
  it("shows five bars from 5 stars down to 1 star", () => {
    renderHistogram(DISTRIBUTION, 12);

    const meters = screen.getAllByRole("meter");
    expect(meters.map((meter) => meter.getAttribute("aria-valuetext"))).toEqual([
      "5 étoiles : 2 avis",
      "4 étoiles : 7 avis",
      "3 étoiles : 2 avis",
      "2 étoiles : 0 avis",
      "1 étoile : 1 avis",
    ]);
  });

  it("labels a bar with its stars and gives it a readable summary", () => {
    renderHistogram(DISTRIBUTION, 12);

    const bar = screen.getByRole("meter", { name: "4 étoiles" });
    expect(bar).toHaveAttribute("aria-valuetext", "4 étoiles : 7 avis");
    expect(bar).toHaveAttribute("aria-valuenow", "7");
    expect(bar).toHaveAttribute("aria-valuemax", "12");
    expect(within(bar).getByText("7 avis")).toBeInTheDocument();
  });

  it("shows the one-star label in the singular", () => {
    renderHistogram(DISTRIBUTION, 12);

    expect(screen.getByRole("meter", { name: "1 étoile" })).toBeInTheDocument();
  });

  it("shows five empty bars when nobody reviewed the beer", () => {
    renderHistogram([], 0);

    const meters = screen.getAllByRole("meter");
    expect(meters).toHaveLength(5);
    meters.forEach((meter) => {
      expect(meter).toHaveAttribute("aria-valuenow", "0");
      expect(meter).toHaveAttribute("aria-valuemax", "1");
    });
    expect(screen.getAllByText("0 avis")).toHaveLength(5);
  });

  it("counts a missing bucket as zero", () => {
    renderHistogram([{ stars: 5, count: 3 }], 3);

    expect(screen.getByRole("meter", { name: "5 étoiles" })).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByRole("meter", { name: "2 étoiles" })).toHaveAttribute("aria-valuenow", "0");
  });

  it("groups the bars under an accessible label", () => {
    renderHistogram(DISTRIBUTION, 12);

    expect(screen.getByRole("group", { name: "Répartition des notes" })).toBeInTheDocument();
  });
});
