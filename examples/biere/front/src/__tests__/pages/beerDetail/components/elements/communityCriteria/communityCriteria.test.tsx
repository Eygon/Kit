import { CommunityCriteria } from "@/pages/beerDetail/components/elements/communityCriteria/communityCriteria";
import { screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import i18n from "@/i18n/i18n";
import { ReviewCriterionEnum } from "@/types/enums/review/reviewCriterionEnum";
import type { CriterionAverage } from "@/types/models/beer/criterionAverage";

const MIXED: CriterionAverage[] = [
  { criterion: ReviewCriterionEnum.SWEETNESS, average: 2.7, count: 3 },
  { criterion: ReviewCriterionEnum.ACIDITY, average: null, count: 1 },
  { criterion: ReviewCriterionEnum.BODY, average: null, count: 0 },
];

const renderCriteria = (criteria: CriterionAverage[]) => {
  return renderWithProviders(<CommunityCriteria criteria={criteria} />);
};

describe("CommunityCriteria", () => {
  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("reads a visible average with the label of its level", () => {
    renderCriteria(MIXED);

    expect(screen.getByText("Douceur 2,7 / 5 · Sèche")).toBeInTheDocument();
  });

  it("draws a bar from 0 to 5 for a visible average", () => {
    renderCriteria(MIXED);

    const bar = screen.getByRole("meter", { name: "Douceur 2,7 / 5 · Sèche" });
    expect(bar).toHaveAttribute("aria-valuenow", "2.7");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "5");
  });

  it("tells how many reviews are missing for a hidden criterion and draws no bar", () => {
    renderCriteria(MIXED);

    expect(screen.getByText("Acidité : encore 2 avis pour afficher ce critère")).toBeInTheDocument();
    expect(screen.getByText("Corps : encore 3 avis pour afficher ce critère")).toBeInTheDocument();
    expect(screen.getAllByRole("meter")).toHaveLength(1);
  });

  it("counts a single missing review in the singular form of the key", () => {
    renderCriteria([{ criterion: ReviewCriterionEnum.BODY, average: null, count: 2 }]);

    expect(screen.getByText("Corps : encore 1 avis pour afficher ce critère")).toBeInTheDocument();
  });

  it("labels the level an average has reached, from the lowest to the highest", () => {
    renderCriteria([
      { criterion: ReviewCriterionEnum.SWEETNESS, average: 1, count: 3 },
      { criterion: ReviewCriterionEnum.ACIDITY, average: 3, count: 4 },
      { criterion: ReviewCriterionEnum.BODY, average: 5, count: 5 },
    ]);

    expect(screen.getByText("Douceur 1,0 / 5 · Très sèche")).toBeInTheDocument();
    expect(screen.getByText("Acidité 3,0 / 5 · Moyenne")).toBeInTheDocument();
    expect(screen.getByText("Corps 5,0 / 5 · Très plein")).toBeInTheDocument();
  });

  it("does not round an average up to the next level", () => {
    renderCriteria([{ criterion: ReviewCriterionEnum.SWEETNESS, average: 4.9, count: 3 }]);

    expect(screen.getByText("Douceur 4,9 / 5 · Douce")).toBeInTheDocument();
  });

  it("renders the criteria in English with a decimal point", async () => {
    await i18n.changeLanguage("en");
    renderCriteria(MIXED);

    expect(screen.getByText("Sweetness 2.7 / 5 · Dry")).toBeInTheDocument();
    expect(screen.getByText("Acidity: 2 more reviews to show this criterion")).toBeInTheDocument();
  });

  it("renders nothing for a beer without criteria", () => {
    const { container } = renderCriteria([]);

    expect(container).toBeEmptyDOMElement();
  });
});
