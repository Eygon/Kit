import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import i18n from "@/i18n/i18n";
import { BadgeSection } from "@/pages/profile/components/widgets/badgeSection/badgeSection";
import { BadgeKindEnum } from "@/types/enums/badge/badgeKindEnum";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import type { Badge } from "@/types/models/badge/badge";

const UNLOCKED_AT = "2026-10-12T12:00:00.000Z";
const FAMILY_TOTAL = 9;
const COMPLETE_FAMILIES = [BeerFamilyEnum.LAGER, BeerFamilyEnum.STOUT];

const flat = (kind: BadgeKindEnum, target: number, overrides: Partial<Badge> = {}): Badge => ({
  id: kind,
  kind,
  family: null,
  unlocked: false,
  unlockedAt: null,
  current: 0,
  target,
  comingSoon: false,
  ...overrides,
});

const specialist = (family: BeerFamilyEnum, overrides: Partial<Badge> = {}): Badge => ({
  id: `specialist-${family}`,
  kind: BadgeKindEnum.SPECIALIST,
  family,
  unlocked: false,
  unlockedAt: null,
  current: 0,
  target: FAMILY_TOTAL,
  comingSoon: false,
  ...overrides,
});

const completeSpecialist = (family: BeerFamilyEnum) =>
  specialist(family, { unlocked: true, unlockedAt: UNLOCKED_AT, current: FAMILY_TOTAL });

const buildBadges = (overrides: Partial<Record<BadgeKindEnum, Partial<Badge>>> = {}, completeFamilies: BeerFamilyEnum[] = []): Badge[] => [
  flat(BadgeKindEnum.FIRST_SIP, 1, overrides[BadgeKindEnum.FIRST_SIP]),
  flat(BadgeKindEnum.EXPLORER, 10, overrides[BadgeKindEnum.EXPLORER]),
  flat(BadgeKindEnum.COLLECTOR, 50, overrides[BadgeKindEnum.COLLECTOR]),
  flat(BadgeKindEnum.COMPLETIONIST, 120, overrides[BadgeKindEnum.COMPLETIONIST]),
  flat(BadgeKindEnum.GLOBETROTTER, 5, overrides[BadgeKindEnum.GLOBETROTTER]),
  ...Object.values(BeerFamilyEnum).map((family) =>
    completeFamilies.includes(family) ? completeSpecialist(family) : specialist(family),
  ),
  flat(BadgeKindEnum.PHOTOGRAPHER, 10, overrides[BadgeKindEnum.PHOTOGRAPHER]),
  flat(BadgeKindEnum.REGULAR, 3, overrides[BadgeKindEnum.REGULAR]),
  flat(BadgeKindEnum.SENTINEL, 10, overrides[BadgeKindEnum.SENTINEL]),
  flat(BadgeKindEnum.CARTOGRAPHER, 1, { comingSoon: true, ...overrides[BadgeKindEnum.CARTOGRAPHER] }),
];

const renderSection = (badges: Badge[], props: { isPending?: boolean; isError?: boolean; onRetry?: () => void } = {}) =>
  renderWithProviders(
    <BadgeSection badges={badges} isPending={props.isPending ?? false} isError={props.isError ?? false} onRetry={props.onRetry ?? vi.fn()} />,
  );

const tileOf = (name: string) => {
  const tile = screen.getByText(name).closest("li");
  if (tile === null) throw new Error(`no tile for ${name}`);
  return within(tile);
};

describe("BadgeSection", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "Europe/Paris");
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await i18n.changeLanguage("fr");
  });

  it("renders a heading and one tile per badge outside the specialist group, in the order received", () => {
    renderSection(buildBadges());

    expect(screen.getByRole("heading", { level: 2, name: "Badges" })).toBeInTheDocument();
    const names = [
      "Première gorgée",
      "Explorateur",
      "Collectionneur",
      "Complétiste",
      "Globe-trotter",
      "Photographe",
      "Habitué",
      "Sentinelle",
      "Cartographe",
    ];
    const positions = names.map((name) => screen.getByText(name));
    positions.slice(1).forEach((node, index) => {
      expect(positions[index].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
    screen.queryAllByText("Lager").forEach((node) => expect(node).not.toBeVisible());
  });

  it("places the specialist group after every other badge tile", () => {
    renderSection(buildBadges());

    const group = screen.getByRole("button", { name: "Spécialiste 0 / 18" });
    ["Première gorgée", "Sentinelle", "Cartographe"].forEach((name) => {
      expect(screen.getByText(name).compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it("shows the name, the criterion with its target and the progress of a locked badge", () => {
    renderSection(buildBadges({ [BadgeKindEnum.EXPLORER]: { current: 4 } }));

    const explorer = tileOf("Explorateur");
    expect(explorer.getByText("Découvrir 10 bières")).toBeInTheDocument();
    expect(explorer.getByText("4 / 10")).toBeInTheDocument();
    expect(explorer.queryByText(/Débloqué le/)).not.toBeInTheDocument();
    expect(tileOf("Complétiste").getByText("Découvrir les 120 bières du catalogue")).toBeInTheDocument();
    expect(tileOf("Photographe").getByText("10 dégustations avec photo")).toBeInTheDocument();
    expect(tileOf("Habitué").getByText("Déguster 3 jours de suite")).toBeInTheDocument();
  });

  it("says Débloqué le with the local date of an unlocked badge, in words and not only by colour", () => {
    renderSection(
      buildBadges({ [BadgeKindEnum.FIRST_SIP]: { unlocked: true, unlockedAt: UNLOCKED_AT, current: 1 } }),
    );

    const firstSip = tileOf("Première gorgée");
    expect(firstSip.getByText("Débloqué le 12/10/2026")).toBeInTheDocument();
    expect(firstSip.queryByText("1 / 1")).not.toBeInTheDocument();
    expect(tileOf("Explorateur").queryByText(/Débloqué le/)).not.toBeInTheDocument();
  });

  it.each(["UTC", "America/Los_Angeles"])("writes the unlock date in the Paris day whatever the phone time zone (%s)", (zone) => {
    vi.stubEnv("TZ", zone);
    renderSection(
      buildBadges({ [BadgeKindEnum.FIRST_SIP]: { unlocked: true, unlockedAt: "2026-10-12T23:30:00.000Z", current: 1 } }),
    );

    expect(tileOf("Première gorgée").getByText("Débloqué le 13/10/2026")).toBeInTheDocument();
  });

  it("locks every badge at zero for a user without tasting and shows Bientôt instead of a progress on Cartographe", () => {
    renderSection(buildBadges());

    expect(screen.queryByText(/Débloqué le/)).not.toBeInTheDocument();
    expect(tileOf("Première gorgée").getByText("0 / 1")).toBeInTheDocument();
    expect(tileOf("Explorateur").getByText("0 / 10")).toBeInTheDocument();
    expect(tileOf("Collectionneur").getByText("0 / 50")).toBeInTheDocument();
    expect(tileOf("Complétiste").getByText("0 / 120")).toBeInTheDocument();
    expect(tileOf("Globe-trotter").getByText("0 / 5")).toBeInTheDocument();
    expect(tileOf("Photographe").getByText("0 / 10")).toBeInTheDocument();
    expect(tileOf("Habitué").getByText("0 / 3")).toBeInTheDocument();
    expect(tileOf("Sentinelle").getByText("0 / 10")).toBeInTheDocument();
    const cartographer = tileOf("Cartographe");
    expect(cartographer.getByText("Bientôt")).toBeInTheDocument();
    expect(cartographer.queryByText("0 / 1")).not.toBeInTheDocument();
    expect(screen.getAllByText("Bientôt")).toHaveLength(1);
  });

  it("titles the specialist group with the unlocked count over the received count", () => {
    renderSection(buildBadges({}, COMPLETE_FAMILIES));

    expect(screen.getByRole("button", { name: "Spécialiste 2 / 18" })).toBeInTheDocument();
  });

  it("counts a specialist group of zero over eighteen for a user without tasting", () => {
    renderSection(buildBadges());

    expect(screen.getByRole("button", { name: "Spécialiste 0 / 18" })).toBeInTheDocument();
  });

  it("counts the specialist badges actually received", () => {
    renderSection(buildBadges({}, COMPLETE_FAMILIES).filter((badge) => badge.family !== BeerFamilyEnum.PORTER));

    expect(screen.getByRole("button", { name: "Spécialiste 2 / 17" })).toBeInTheDocument();
  });

  it("lists the eighteen families with their state once the specialist group is opened", async () => {
    const user = userEvent.setup();
    renderSection(buildBadges({}, COMPLETE_FAMILIES));

    await user.click(screen.getByRole("button", { name: "Spécialiste 2 / 18" }));

    Object.values(BeerFamilyEnum).forEach((family) => {
      const label = i18n.t(`beer.families.${family}`);
      expect(screen.getByText(label)).toBeVisible();
    });
    expect(tileOf("Lager").getByText("Débloqué le 12/10/2026")).toBeInTheDocument();
    expect(tileOf("Stout").getByText("Débloqué le 12/10/2026")).toBeInTheDocument();
    expect(tileOf("IPA").getByText("0 / 9")).toBeInTheDocument();
    expect(tileOf("IPA").queryByText(/Débloqué le/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Débloqué le/)).toHaveLength(2);
  });

  it("shows the progress of a started family", async () => {
    const user = userEvent.setup();
    const badges = buildBadges().map((badge) => (badge.family === BeerFamilyEnum.SAISON ? { ...badge, current: 4 } : badge));
    renderSection(badges);

    await user.click(screen.getByRole("button", { name: "Spécialiste 0 / 18" }));

    expect(tileOf("Saison").getByText("4 / 9")).toBeInTheDocument();
  });

  it("keeps a family without any beer locked at 0 / 0", async () => {
    const user = userEvent.setup();
    const badges = buildBadges().map((badge) => (badge.family === BeerFamilyEnum.FRUIT ? { ...badge, target: 0 } : badge));
    renderSection(badges);

    await user.click(screen.getByRole("button", { name: "Spécialiste 0 / 18" }));

    expect(tileOf("Fruitée").getByText("0 / 0")).toBeInTheDocument();
    expect(tileOf("Fruitée").queryByText(/Débloqué le/)).not.toBeInTheDocument();
  });

  it("follows the catalogue total in the criterion and the progress of Complétiste", () => {
    renderSection(buildBadges({ [BadgeKindEnum.COMPLETIONIST]: { target: 125, current: 120 } }));

    const completionist = tileOf("Complétiste");
    expect(completionist.getByText("Découvrir les 125 bières du catalogue")).toBeInTheDocument();
    expect(completionist.getByText("120 / 125")).toBeInTheDocument();
    expect(completionist.queryByText(/Débloqué le/)).not.toBeInTheDocument();
  });

  it("lists a specialist whose family is unknown under the specialist name instead of dropping it", async () => {
    const user = userEvent.setup();
    const badges = buildBadges().map((badge) => (badge.family === BeerFamilyEnum.PORTER ? { ...badge, family: null } : badge));
    renderSection(badges);

    await user.click(screen.getByRole("button", { name: "Spécialiste 0 / 18" }));

    expect(screen.getByText("Spécialiste", { selector: "span" })).toBeInTheDocument();
  });

  it("shows nine skeletons while loading and no badge content", () => {
    renderSection([], { isPending: true });

    expect(screen.getByRole("heading", { level: 2, name: "Badges" })).toBeInTheDocument();
    expect(screen.getAllByTestId("badge-skeleton")).toHaveLength(9);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Aucun badge")).not.toBeInTheDocument();
  });

  it("shows an alert with a retry button in the section on error, and retries on press", async () => {
    const onRetry = vi.fn();
    renderSection([], { isError: true, onRetry });

    expect(screen.getByRole("heading", { level: 2, name: "Badges" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Badges indisponibles.");
    expect(screen.queryByTestId("badge-skeleton")).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Réessayer" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state when no badge was received", () => {
    renderSection([]);

    expect(screen.getByRole("heading", { level: 2, name: "Aucun badge" })).toBeInTheDocument();
    expect(screen.getByText("Les badges apparaîtront ici.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("writes names, criteria, dates and the specialist title in English", async () => {
    await i18n.changeLanguage("en");
    renderSection(
      buildBadges({ [BadgeKindEnum.FIRST_SIP]: { unlocked: true, unlockedAt: UNLOCKED_AT, current: 1 } }, COMPLETE_FAMILIES),
    );

    expect(screen.getByRole("heading", { level: 2, name: "Badges" })).toBeInTheDocument();
    const firstSip = tileOf("First sip");
    expect(firstSip.getByText("Discover a first beer")).toBeInTheDocument();
    expect(firstSip.getByText("Unlocked on 10/12/26")).toBeInTheDocument();
    expect(tileOf("Explorer").getByText("Discover 10 beers")).toBeInTheDocument();
    expect(tileOf("Completionist").getByText("Discover all 120 beers in the catalogue")).toBeInTheDocument();
    expect(tileOf("Regular").getByText("Taste on 3 days in a row")).toBeInTheDocument();
    expect(tileOf("Cartographer").getByText("Coming soon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Specialist 2 / 18" })).toBeInTheDocument();
    expect(screen.queryByText("Première gorgée")).not.toBeInTheDocument();
  });
});
