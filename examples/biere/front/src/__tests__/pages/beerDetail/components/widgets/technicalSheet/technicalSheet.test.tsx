import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import CorrectionService from "@/api/corrections/correctionService";
import { createTestQueryClient, renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { TechnicalSheet } from "@/pages/beerDetail/components/widgets/technicalSheet/technicalSheet";
import i18n from "@/i18n/i18n";
import { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
import { BeerSourceEnum } from "@/types/enums/beer/beerSourceEnum";
import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";
import type { Beer } from "@/types/models/beer/beer";
import { CorrectionStatusEnum } from "@/types/enums/correction/correctionStatusEnum";
import type { Correction } from "@/types/models/correction/correction";
import { CorrectionVoteSenseEnum } from "@/types/enums/correction/correctionVoteSenseEnum";
import { correctionKeys } from "@/utils/queryKeys/correctionQueryKeys";

vi.mock("@/api/corrections/correctionService", () => ({
  default: { getForBeer: vi.fn(), propose: vi.fn(), vote: vi.fn() },
}));

const IBU_CORRECTION: Correction = {
  id: 5,
  beerId: 1,
  beerName: "Chimay Rouge",
  characteristic: BeerCharacteristicEnum.IBU,
  currentValue: null,
  proposedValue: 35,
  reason: "Fiche du brasseur",
  proposedBy: 2,
  proposedByName: "Bob",
  createdAt: "2026-10-10T10:00:00.000Z",
  closesAt: "2026-10-17T10:00:00.000Z",
  status: CorrectionStatusEnum.OPEN,
  resolvedAt: null,
  agreeCount: 2,
  disagreeCount: 1,
  myVote: null,
  isMine: false,
};

const DEGREE_TEXT = /^7\s%$/;

const FULL_BEER: Beer = {
  id: 1,
  name: "Chimay Rouge",
  breweryName: "Bières de Chimay",
  country: "BE",
  styleId: 4,
  styleName: "Dubbel trappiste",
  family: BeerFamilyEnum.TRAPPIST,
  abv: 7,
  aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
  formats: [BeerFormatEnum.BOTTLE],
  description: "Une trappiste cuivrée.",
  drunk: false,
  checkinCount: 0,
  inWishlist: false,
  bitternessLevel: 3,
  colorLevel: 3,
  styleColorRange: null,
  averageRating: null,
  reviewCount: 0,
  ratingDistribution: [],
  source: BeerSourceEnum.OFFICIAL,
  createdByName: null,
  ibu: 35,
  ebc: 20,
  sweetness: 3,
  acidity: null,
  body: 4,
  createdBy: null,
};

const renderSheet = (overrides: Partial<Beer> = {}) => renderWithProviders(<TechnicalSheet beer={{ ...FULL_BEER, ...overrides }} />);

const getRow = (name: string) => screen.getByText(name, { selector: "dt" }).parentElement as HTMLElement;

const getValues = (row: HTMLElement) => Array.from(row.querySelectorAll("dd > *"));

const getSwatches = (row: HTMLElement) => Array.from(row.querySelectorAll('[aria-hidden="true"]'));

describe("TechnicalSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (CorrectionService.getForBeer as Mock).mockResolvedValue([]);
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("US7 AC1 lists the eight characteristics in order under the Fiche technique title", () => {
    renderSheet();

    const heading = screen.getByRole("heading", { level: 2, name: "Fiche technique" });
    expect(heading).toHaveClass("font-display", "text-xl");
    const terms = within(heading.parentElement as HTMLElement).getAllByRole("term");
    expect(terms.map((term) => term.textContent)).toEqual(["Degré", "Amertume", "Couleur", "Douceur", "Acidité", "Corps", "Arômes", "Formats"]);
  });

  it("US7 AC1 writes the degree, the bitterness with its level, the scales and the unknown acidity", () => {
    renderSheet();

    expect(within(getRow("Degré")).getByText(DEGREE_TEXT)).toBeInTheDocument();
    expect(within(getRow("Amertume")).getByText("35 IBU · Modérée")).toBeInTheDocument();
    expect(within(getRow("Douceur")).getByText("3 / 5 · Équilibrée")).toBeInTheDocument();
    expect(within(getRow("Acidité")).getByText("Non renseignée")).toBeInTheDocument();
    expect(within(getRow("Corps")).getByText("4 / 5 · Rond")).toBeInTheDocument();
  });

  it("US7 AC1 writes the colour with its level after a decorative swatch of that level", () => {
    renderSheet();
    const row = getRow("Couleur");

    const swatches = getSwatches(row);
    expect(swatches).toHaveLength(1);
    expect(swatches[0]).toHaveClass("bg-beer-3", "rounded-full", "border-mousse", "size-6");
    expect(swatches[0]).toBeEmptyDOMElement();
    const text = within(row).getByText("20 EBC · Ambrée");
    expect(swatches[0].compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(row).queryByText(/typique du style/)).not.toBeInTheDocument();
  });

  it.each([
    [1, "Très légère", "bg-beer-1", 1, "Pâle"],
    [2, "Légère", "bg-beer-2", 2, "Dorée"],
    [4, "Marquée", "bg-beer-4", 4, "Brune"],
    [5, "Intense", "bg-beer-5", 5, "Noire"],
  ])("maps bitterness level %i to %s (colour %s) and colour level %i to %s", (bitternessLevel, bitterness, swatchClass, colorLevel, color) => {
    renderSheet({ bitternessLevel, colorLevel });

    expect(within(getRow("Amertume")).getByText(`35 IBU · ${bitterness}`)).toBeInTheDocument();
    expect(within(getRow("Couleur")).getByText(`20 EBC · ${color}`)).toBeInTheDocument();
    expect(getSwatches(getRow("Couleur"))[0]).toHaveClass(swatchClass);
  });

  it("US7 AC1 shows the aromas and the formats as chips, one per value, inside their own row", () => {
    renderSheet();

    const aromas = getRow("Arômes");
    expect(within(aromas).getByText("Fruité")).toBeInTheDocument();
    expect(within(aromas).getByText("Houblonné")).toBeInTheDocument();
    expect(within(aromas).queryByText("Bouteille")).not.toBeInTheDocument();
    expect(within(aromas).queryByText("Non renseignée")).not.toBeInTheDocument();
    const formats = getRow("Formats");
    expect(within(formats).getByText("Bouteille")).toBeInTheDocument();
    expect(within(formats).queryByText("Fruité")).not.toBeInTheDocument();
    expect(getValues(formats)).toHaveLength(1);
  });

  it("US7 AC1 draws each aroma and each format as an accent chip, not as plain text", () => {
    renderSheet();

    const aromas = getRow("Arômes");
    ["Fruité", "Houblonné"].forEach((aroma) => expect(within(aromas).getByText(aroma).closest(".chip--accent")).not.toBeNull());
    expect(within(getRow("Formats")).getByText("Bouteille").closest(".chip--accent")).not.toBeNull();
    expect(within(getRow("Degré")).getByText(DEGREE_TEXT).closest(".chip")).toBeNull();
    expect(within(getRow("Amertume")).getByText("35 IBU · Modérée").closest(".chip")).toBeNull();
  });

  it("US7 AC1 renders every characteristic in English", async () => {
    await i18n.changeLanguage("en");
    renderSheet();

    expect(screen.getByRole("heading", { level: 2, name: "Technical sheet" })).toBeInTheDocument();
    expect(within(getRow("ABV")).getByText(DEGREE_TEXT)).toBeInTheDocument();
    expect(within(getRow("Bitterness")).getByText("35 IBU · Moderate")).toBeInTheDocument();
    expect(within(getRow("Colour")).getByText("20 EBC · Amber")).toBeInTheDocument();
    expect(within(getRow("Sweetness")).getByText("3 / 5 · Balanced")).toBeInTheDocument();
    expect(within(getRow("Acidity")).getByText("Not provided")).toBeInTheDocument();
    expect(within(getRow("Body")).getByText("4 / 5 · Round")).toBeInTheDocument();
    expect(within(getRow("Aromas")).getByText("Fruity")).toBeInTheDocument();
    expect(within(getRow("Formats")).getByText("Bottle")).toBeInTheDocument();
  });

  it("US7 AC2 says Non renseignée for a missing colour then the typical range of the style below it", () => {
    renderSheet({ ebc: null, colorLevel: null, styleColorRange: { min: 3, max: 4 } });
    const row = getRow("Couleur");

    const missing = within(row).getByText("Non renseignée");
    const hint = within(row).getByText("Ambrée à brune · typique du style");
    expect(missing.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hint.parentElement).toHaveClass("basis-full");
    const swatches = getSwatches(row);
    expect(swatches).toHaveLength(2);
    expect(swatches[0]).toHaveClass("bg-beer-3");
    expect(swatches[1]).toHaveClass("bg-beer-4");
  });

  it("US7 AC2 shows a single typical colour of the style as one swatch", () => {
    renderSheet({ ebc: null, colorLevel: null, styleColorRange: { min: 1, max: 1 } });
    const row = getRow("Couleur");

    expect(within(row).getByText("Non renseignée")).toBeInTheDocument();
    expect(within(row).getByText("Pâle · typique du style")).toBeInTheDocument();
    expect(getSwatches(row)).toHaveLength(1);
    expect(getSwatches(row)[0]).toHaveClass("bg-beer-1");
  });

  it("US7 AC2 shows the typical range in English", async () => {
    await i18n.changeLanguage("en");
    renderSheet({ ebc: null, colorLevel: null, styleColorRange: { min: 3, max: 4 } });

    expect(within(getRow("Colour")).getByText("Not provided")).toBeInTheDocument();
    expect(within(getRow("Colour")).getByText("Amber to brown · typical of the style")).toBeInTheDocument();
  });

  it("says Non renseignée alone, without a swatch, when the colour and the style range are both missing", () => {
    renderSheet({ ebc: null, colorLevel: null, styleColorRange: null });
    const row = getRow("Couleur");

    expect(within(row).getByText("Non renseignée")).toBeInTheDocument();
    expect(within(row).queryByText(/typique du style/)).not.toBeInTheDocument();
    expect(getSwatches(row)).toHaveLength(0);
  });

  it("prefers the colour of the beer over the style range", () => {
    renderSheet({ colorLevel: 5, styleColorRange: { min: 1, max: 2 } });
    const row = getRow("Couleur");

    expect(within(row).getByText("20 EBC · Noire")).toBeInTheDocument();
    expect(within(row).queryByText(/typique du style/)).not.toBeInTheDocument();
    expect(getSwatches(row)).toHaveLength(1);
  });

  it("writes the colour without level or swatch when the level is missing", () => {
    renderSheet({ colorLevel: null });
    const row = getRow("Couleur");

    expect(within(row).getByText("20 EBC")).toBeInTheDocument();
    expect(getSwatches(row)).toHaveLength(0);
  });

  it("writes the bitterness without level when the level is missing", () => {
    renderSheet({ bitternessLevel: null });
    expect(within(getRow("Amertume")).getByText("35 IBU")).toBeInTheDocument();
  });

  it("says Non renseignée for a missing bitterness whatever its level", () => {
    renderSheet({ ibu: null, bitternessLevel: 4 });

    expect(within(getRow("Amertume")).getByText("Non renseignée")).toBeInTheDocument();
    expect(screen.queryByText(/IBU/)).not.toBeInTheDocument();
  });

  it("US7 AC3 says Non renseignée on the aroma row of a beer without aroma and shows no chip there", () => {
    renderSheet({ aromas: [] });
    const row = getRow("Arômes");

    expect(within(row).getByText("Non renseignée")).toBeInTheDocument();
    expect(getValues(row)).toHaveLength(1);
    expect(within(getRow("Formats")).queryByText("Non renseignée")).not.toBeInTheDocument();
  });

  it("says Non renseignée on the format row of a beer without format", () => {
    renderSheet({ formats: [] });

    expect(within(getRow("Formats")).getByText("Non renseignée")).toBeInTheDocument();
    expect(within(getRow("Arômes")).queryByText("Non renseignée")).not.toBeInTheDocument();
  });

  it("says Non renseignée on every row of a beer that has no technical value", () => {
    renderSheet({ ibu: null, ebc: null, sweetness: null, acidity: null, body: null, aromas: [], formats: [], bitternessLevel: null, colorLevel: null });

    expect(screen.getAllByText("Non renseignée")).toHaveLength(7);
    expect(within(getRow("Degré")).getByText(DEGREE_TEXT)).toBeInTheDocument();
  });

  it("US7 AC4 lets every row wrap and shrink on a narrow screen, even with long unbroken values", () => {
    renderSheet({ ebc: null, colorLevel: null, styleColorRange: { min: 1, max: 5 } });

    const descriptions = screen.getAllByRole("definition");
    expect(descriptions).toHaveLength(8);
    descriptions.forEach((description) => {
      expect(description).toHaveClass("min-w-0", "flex-wrap", "break-words");
      expect(description.parentElement).toHaveClass("min-w-0");
    });
  });

  it("draws the sheet as a mousse card with a hard shadow, inside the page padding", () => {
    renderSheet();

    const card = screen.getAllByRole("term")[0].closest("dl") as HTMLElement;
    expect(card).toHaveClass("rounded-mousse", "border-mousse", "bg-surface", "p-4", "shadow-mousse");
    expect(card.closest("section")).not.toHaveClass("overflow-hidden");
  });

  it("US11 AC1 shows the open correction under the row of its characteristic, with its change, author, reason and tally", async () => {
    (CorrectionService.getForBeer as Mock).mockResolvedValue([{ ...IBU_CORRECTION, currentValue: null }]);
    renderSheet({ ibu: null, bitternessLevel: null });

    const row = getRow("Amertume");
    expect(await within(row).findByText("Non renseignée → 35 IBU")).toBeInTheDocument();
    expect(within(row).getByText("Proposée par Bob")).toBeInTheDocument();
    expect(within(row).getByText("Fiche du brasseur")).toBeInTheDocument();
    expect(within(row).getByText("2 d'accord · 1 pas d'accord")).toBeInTheDocument();
    expect(CorrectionService.getForBeer).toHaveBeenCalledWith(1);
    ["Degré", "Couleur", "Douceur", "Acidité", "Corps", "Arômes", "Formats"].forEach((name) => {
      expect(within(getRow(name)).queryByText("Proposée par Bob")).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("Proposée par Bob")).toHaveLength(1);
  });

  it("US11 AC1 puts a correction of another characteristic under its own row only", async () => {
    (CorrectionService.getForBeer as Mock).mockResolvedValue([
      { ...IBU_CORRECTION, id: 6, characteristic: BeerCharacteristicEnum.BODY, currentValue: 4, proposedValue: 2, proposedByName: "Carol" },
    ]);
    renderSheet();

    expect(await within(getRow("Corps")).findByText("Proposée par Carol")).toBeInTheDocument();
    expect(within(getRow("Amertume")).queryByText(/Proposée par/)).not.toBeInTheDocument();
  });

  it("US11 AC1 shows the correction of every characteristic that has one", async () => {
    (CorrectionService.getForBeer as Mock).mockResolvedValue([
      IBU_CORRECTION,
      { ...IBU_CORRECTION, id: 6, characteristic: BeerCharacteristicEnum.BODY, proposedByName: "Carol", proposedValue: 2 },
    ]);
    renderSheet();

    expect(await within(getRow("Amertume")).findByText("Proposée par Bob")).toBeInTheDocument();
    expect(await within(getRow("Corps")).findByText("Proposée par Carol")).toBeInTheDocument();
  });

  it("US11 AC2 shows no card when no correction is open", async () => {
    renderSheet();

    await waitFor(() => expect(CorrectionService.getForBeer).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText(/Proposée par/)).not.toBeInTheDocument());
    expect(screen.queryByText(/d'accord/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("definition")).toHaveLength(8);
  });

  it("US11 AC3 keeps the sheet readable and shows no card while the corrections load", () => {
    (CorrectionService.getForBeer as Mock).mockReturnValue(new Promise(() => undefined));
    renderSheet();

    expect(screen.getAllByRole("term")).toHaveLength(8);
    expect(within(getRow("Amertume")).getByText("35 IBU · Modérée")).toBeInTheDocument();
    expect(screen.queryByText(/Proposée par/)).not.toBeInTheDocument();
  });

  it("US11 AC3 keeps the sheet readable and shows no card when the corrections fail to load", async () => {
    (CorrectionService.getForBeer as Mock).mockRejectedValue(new Error("server down"));
    const queryClient = createTestQueryClient();
    renderWithProviders(<TechnicalSheet beer={FULL_BEER} />, { queryClient });

    await waitFor(() => expect(queryClient.getQueryState(correctionKeys.forBeer(FULL_BEER.id))?.status).toBe("error"));
    expect(screen.getAllByRole("term")).toHaveLength(8);
    expect(within(getRow("Amertume")).getByText("35 IBU · Modérée")).toBeInTheDocument();
    expect(within(getRow("Degré")).getByText(DEGREE_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(/Proposée par/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("US12 AC1 marks the chosen button and shows the new counters once the vote is sent and the corrections are read again", async () => {
    const user = userEvent.setup();
    (CorrectionService.getForBeer as Mock).mockResolvedValue([IBU_CORRECTION]);
    (CorrectionService.vote as Mock).mockImplementation(async () => {
      (CorrectionService.getForBeer as Mock).mockResolvedValue([
        { ...IBU_CORRECTION, agreeCount: 3, myVote: CorrectionVoteSenseEnum.AGREE },
      ]);
      return IBU_CORRECTION;
    });
    renderSheet();
    const row = getRow("Amertume");
    expect(await within(row).findByText("2 d'accord · 1 pas d'accord")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "D'accord" })).toHaveAttribute("aria-pressed", "false");

    await user.click(within(row).getByRole("button", { name: "D'accord" }));

    expect(CorrectionService.vote).toHaveBeenCalledWith(5, CorrectionVoteSenseEnum.AGREE);
    expect(await within(row).findByText("3 d'accord · 1 pas d'accord")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "D'accord" })).toHaveAttribute("aria-pressed", "true");
    expect(within(row).getByRole("button", { name: "Pas d'accord" })).toHaveAttribute("aria-pressed", "false");
  });

  it("US12 AC2 moves the choice and the counters to Pas d'accord when the user who agreed changes sides", async () => {
    const user = userEvent.setup();
    const agreed = { ...IBU_CORRECTION, myVote: CorrectionVoteSenseEnum.AGREE };
    (CorrectionService.getForBeer as Mock).mockResolvedValue([agreed]);
    (CorrectionService.vote as Mock).mockImplementation(async () => {
      (CorrectionService.getForBeer as Mock).mockResolvedValue([
        { ...agreed, agreeCount: 1, disagreeCount: 2, myVote: CorrectionVoteSenseEnum.DISAGREE },
      ]);
      return agreed;
    });
    renderSheet();
    const row = getRow("Amertume");
    await waitFor(() => expect(within(row).getByRole("button", { name: "D'accord" })).toHaveAttribute("aria-pressed", "true"));

    await user.click(within(row).getByRole("button", { name: "Pas d'accord" }));

    expect(CorrectionService.vote).toHaveBeenCalledWith(5, CorrectionVoteSenseEnum.DISAGREE);
    expect(await within(row).findByText("1 d'accord · 2 pas d'accord")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Pas d'accord" })).toHaveAttribute("aria-pressed", "true");
    expect(within(row).getByRole("button", { name: "D'accord" })).toHaveAttribute("aria-pressed", "false");
  });

  it("US11 AC4 shows a reason made of HTML as plain text inside the sheet", async () => {
    (CorrectionService.getForBeer as Mock).mockResolvedValue([{ ...IBU_CORRECTION, reason: "<b>gras</b>" }]);
    renderSheet();

    const row = getRow("Amertume");
    expect(await within(row).findByText("<b>gras</b>")).toBeInTheDocument();
    expect(row.querySelector("b")).toBeNull();
  });
});

describe("TechnicalSheet proposal buttons", () => {
  const PROPOSE_LABEL = "Proposer une correction";

  const getButtons = () => screen.queryAllByRole("button", { name: new RegExp(PROPOSE_LABEL) });

  const rowOf = (name: string) => getRow(name);

  beforeEach(() => {
    vi.clearAllMocks();
    (CorrectionService.getForBeer as Mock).mockResolvedValue([]);
  });

  afterEach(async () => {
    window.localStorage.removeItem(StorageKeyEnum.CURRENT_USER_ID);
    await i18n.changeLanguage("fr");
  });

  it("US13 AC1 offers the button under every row once the corrections are loaded, each named after its characteristic", async () => {
    renderSheet();

    await waitFor(() => expect(getButtons()).toHaveLength(8));
    ["Degré", "Amertume", "Couleur", "Douceur", "Acidité", "Corps", "Arômes", "Formats"].forEach((name) => {
      expect(within(rowOf(name)).getByRole("button", { name: `${PROPOSE_LABEL} : ${name}` })).toBeInTheDocument();
      expect(within(rowOf(name)).getAllByRole("button")).toHaveLength(1);
    });
  });

  it("US13 AC1 opens the sheet of the characteristic of the row, with the current value read on the beer", async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(await within(rowOf("Amertume")).findByRole("button", { name: `${PROPOSE_LABEL} : Amertume` }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Corriger : Amertume" })).toBeInTheDocument();
    expect(within(dialog).getByText("Valeur actuelle : 35 IBU")).toBeInTheDocument();
  });

  it("US13 AC1 hands a missing value of the beer to the sheet as not provided", async () => {
    const user = userEvent.setup();
    renderSheet({ ibu: null, bitternessLevel: null });

    await user.click(await within(rowOf("Amertume")).findByRole("button", { name: `${PROPOSE_LABEL} : Amertume` }));

    expect(within(await screen.findByRole("dialog")).getByText("Valeur actuelle : Non renseignée")).toBeInTheDocument();
  });

  it("US13 AC1 hands the aromas of the beer to the sheet as the current value", async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(await within(rowOf("Arômes")).findByRole("button", { name: `${PROPOSE_LABEL} : Arômes` }));

    expect(within(await screen.findByRole("dialog")).getByText("Valeur actuelle : Fruité, Houblonné")).toBeInTheDocument();
  });

  it("US13 AC1 shows the card under the row once the proposal is sent, in place of the button", async () => {
    const user = userEvent.setup();
    (CorrectionService.propose as Mock).mockImplementation(async () => {
      (CorrectionService.getForBeer as Mock).mockResolvedValue([{ ...IBU_CORRECTION, proposedByName: "Alice", isMine: true }]);
      return IBU_CORRECTION;
    });
    renderSheet({ ibu: null, bitternessLevel: null });
    await user.click(await within(rowOf("Amertume")).findByRole("button", { name: `${PROPOSE_LABEL} : Amertume` }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("textbox", { name: /Amertume/ }), "35");
    await user.type(within(dialog).getByRole("textbox", { name: /Motif/ }), "Fiche du brasseur");
    await user.tab();

    await user.click(within(dialog).getByRole("button", { name: "Proposer" }));

    expect(await within(rowOf("Amertume")).findByText("Proposée par Alice")).toBeInTheDocument();
    expect(CorrectionService.propose).toHaveBeenCalledWith(1, { characteristic: "ibu", value: 35, reason: "Fiche du brasseur" });
    await waitFor(() => expect(within(rowOf("Amertume")).queryByRole("button", { name: new RegExp(PROPOSE_LABEL) })).not.toBeInTheDocument());
    expect(getButtons()).toHaveLength(7);
  });

  it("US13 AC2 shows no button on a community beer the current user added", async () => {
    renderSheet({ source: BeerSourceEnum.COMMUNITY, createdBy: 1 });

    await waitFor(() => expect(CorrectionService.getForBeer).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getAllByRole("definition")).toHaveLength(8));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(getButtons()).toHaveLength(0);
    expect(screen.queryByText(PROPOSE_LABEL)).not.toBeInTheDocument();
  });

  it("US13 AC2 follows the demo user: Bob is the author of his beer, Alice is not", async () => {
    window.localStorage.setItem(StorageKeyEnum.CURRENT_USER_ID, "2");
    const bob = renderSheet({ source: BeerSourceEnum.COMMUNITY, createdBy: 2 });
    await waitFor(() => expect(CorrectionService.getForBeer).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(getButtons()).toHaveLength(0);
    bob.unmount();

    window.localStorage.setItem(StorageKeyEnum.CURRENT_USER_ID, "1");
    renderSheet({ source: BeerSourceEnum.COMMUNITY, createdBy: 2 });
    await waitFor(() => expect(getButtons()).toHaveLength(8));
  });

  it("US13 AC2 keeps the buttons on a beer of another author and on an official beer", async () => {
    renderSheet({ source: BeerSourceEnum.COMMUNITY, createdBy: 3 });

    await waitFor(() => expect(getButtons()).toHaveLength(8));
  });

  it("US13 AC2 keeps the buttons on an official beer for everyone, even when its createdBy matches the current user", async () => {
    window.localStorage.setItem(StorageKeyEnum.CURRENT_USER_ID, "1");
    renderSheet({ source: BeerSourceEnum.OFFICIAL, createdBy: 1 });

    await waitFor(() => expect(getButtons()).toHaveLength(8));
  });

  it("US13 AC3 puts the card and not the button on the row that has an open proposal", async () => {
    (CorrectionService.getForBeer as Mock).mockResolvedValue([IBU_CORRECTION]);
    renderSheet();

    const row = rowOf("Amertume");
    expect(await within(row).findByText("Proposée par Bob")).toBeInTheDocument();
    await waitFor(() => expect(getButtons()).toHaveLength(7));
    expect(within(row).queryByRole("button", { name: new RegExp(PROPOSE_LABEL) })).not.toBeInTheDocument();
    ["Degré", "Couleur", "Douceur", "Acidité", "Corps", "Arômes", "Formats"].forEach((name) => {
      expect(within(rowOf(name)).getByRole("button", { name: `${PROPOSE_LABEL} : ${name}` })).toBeInTheDocument();
    });
  });

  it("US13 AC4 shows no button while the corrections load", async () => {
    (CorrectionService.getForBeer as Mock).mockReturnValue(new Promise(() => undefined));
    renderSheet();

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getAllByRole("term")).toHaveLength(8);
    expect(getButtons()).toHaveLength(0);
  });

  it("US13 AC4 shows no button when the corrections fail to load", async () => {
    (CorrectionService.getForBeer as Mock).mockRejectedValue(new Error("server down"));
    renderSheet();

    await waitFor(() => expect(CorrectionService.getForBeer).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getAllByRole("term")).toHaveLength(8);
    expect(getButtons()).toHaveLength(0);
  });

  it("lays each button on its own line inside the row so the list markup stays valid", async () => {
    renderSheet();

    const button = await within(rowOf("Amertume")).findByRole("button", { name: `${PROPOSE_LABEL} : Amertume` });
    expect(button.closest("dd")).toBe(rowOf("Amertume").querySelector("dd"));
    expect(button.parentElement).toHaveClass("min-w-0", "basis-full");
  });
});
