import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import ProfileService from "@/api/profiles/profileService";
import { getAvatarArtwork } from "@/components/elements/userAvatar/utils/avatarArtworks";
import { ProfileHeader } from "@/components/widgets/profileHeader/profileHeader";
import i18n from "@/i18n/i18n";
import type { Mock } from "vitest";
import type { ProfileHeaderProps } from "@/types/components/profileHeader";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";
import type { Profile } from "@/types/models/profile/profile";

vi.mock("@/api/profiles/profileService", () => ({
  default: { getFollowers: vi.fn(), getFollowing: vi.fn(), getAll: vi.fn(), follow: vi.fn(), unfollow: vi.fn() },
}));

const ALICE: Profile = {
  id: 1,
  displayName: "Alice",
  avatar: AvatarEnum.GLASS,
  level: 2,
  title: LevelTitleEnum.TASTER,
  discoveredCount: 12,
  currentThreshold: 5,
  nextThreshold: 15,
  nextTitle: LevelTitleEnum.HOP_HEAD,
  followerCount: 0,
  followingCount: 2,
  isFollowed: false,
  isMe: true,
};

const LEGEND: Profile = {
  ...ALICE,
  level: 6,
  title: LevelTitleEnum.FOAM_LEGEND,
  discoveredCount: 100,
  currentThreshold: 100,
  nextThreshold: null,
  nextTitle: null,
};

const onRetry = vi.fn();

const renderHeader = (props: Partial<ProfileHeaderProps> = {}) =>
  renderWithProviders(<ProfileHeader profile={ALICE} isPending={false} isError={false} onRetry={onRetry} {...props} />);

describe("ProfileHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("shows the name, the level, the counters and the progress toward the next title", () => {
    renderHeader();

    expect(screen.getByRole("heading", { level: 2, name: "Alice" })).toBeInTheDocument();
    expect(screen.getByText("Niv. 2 · Dégustateur")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "0 abonné" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 abonnements" })).toBeInTheDocument();
    expect(screen.getByText("12 / 15 pour Houblonneur")).toBeInTheDocument();
  });

  it("announces the progress value to screen readers on a named bar", () => {
    renderHeader();

    const bar = screen.getByRole("progressbar", { name: "Progression" });
    expect(bar).toHaveAttribute("aria-valuetext", "12 / 15 pour Houblonneur");
    expect(bar).toHaveAttribute("aria-valuenow", "12");
    expect(bar).toHaveAttribute("aria-valuemin", "5");
    expect(bar).toHaveAttribute("aria-valuemax", "15");
  });

  it("starts the bar at zero for a user below the first threshold", () => {
    renderHeader({ profile: { ...ALICE, level: 1, title: LevelTitleEnum.CURIOUS, discoveredCount: 0, currentThreshold: 0, nextThreshold: 5, nextTitle: LevelTitleEnum.TASTER } });

    const bar = screen.getByRole("progressbar", { name: "Progression" });
    expect(bar).toHaveAttribute("aria-valuetext", "0 / 5 pour Dégustateur");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "5");
  });

  it("shows the max level with a full bar at level 6", () => {
    renderHeader({ profile: LEGEND });

    expect(screen.getByText("Niv. 6 · Légende de la mousse")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: "Progression" });
    expect(bar).toHaveAttribute("aria-valuetext", "Niveau maximal");
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar.querySelector<HTMLElement>("[style]")?.style.width).toBe("100%");
    expect(screen.getByText("Niveau maximal")).toBeInTheDocument();
    expect(screen.queryByText(/pour/)).not.toBeInTheDocument();
  });

  it("keeps the bar full beyond the last threshold", () => {
    renderHeader({ profile: { ...LEGEND, discoveredCount: 140 } });

    const bar = screen.getByRole("progressbar", { name: "Progression" });
    expect(bar).toHaveAttribute("aria-valuenow", "140");
    expect(bar.querySelector<HTMLElement>("[style]")?.style.width).toBe("100%");
  });

  it("fills the bar proportionally between the two thresholds", () => {
    renderHeader({ profile: { ...ALICE, discoveredCount: 10 } });

    const bar = screen.getByRole("progressbar", { name: "Progression" });
    expect(bar.querySelector<HTMLElement>("[style]")?.style.width).toBe("50%");
  });

  it("uses the singular for one follower and one following", () => {
    renderHeader({ profile: { ...ALICE, followerCount: 1, followingCount: 1 } });

    expect(screen.getByRole("button", { name: "1 abonné" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 abonnement" })).toBeInTheDocument();
  });

  it("uses the plural for several followers", () => {
    renderHeader({ profile: { ...ALICE, followerCount: 12, followingCount: 0 } });

    expect(screen.getByRole("button", { name: "12 abonnés" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "0 abonnement" })).toBeInTheDocument();
  });

  it("writes the same card in english", async () => {
    await i18n.changeLanguage("en");
    renderHeader({ profile: { ...ALICE, followerCount: 1, followingCount: 3 } });

    expect(screen.getByText("Lvl 2 · Taster")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 follower" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3 following" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progress" })).toHaveAttribute("aria-valuetext", "12 / 15 to Hop head");
  });

  it("writes the max level in english", async () => {
    await i18n.changeLanguage("en");
    renderHeader({ profile: LEGEND });

    expect(screen.getByRole("progressbar", { name: "Progress" })).toHaveAttribute("aria-valuetext", "Max level");
  });

  it("hides the decorative avatar from screen readers", () => {
    const { container } = renderHeader();

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("svg[aria-hidden='true']")).toBeInTheDocument();
  });

  it.each([AvatarEnum.GLASS, AvatarEnum.HOP])("draws the %s avatar of the profile", (avatar) => {
    const { container } = renderHeader({ profile: { ...ALICE, avatar } });

    const paths = Array.from(container.querySelectorAll("svg[aria-hidden='true'] path"));
    expect(paths.map((path) => path.getAttribute("d"))).toEqual(getAvatarArtwork(avatar).shapes.map((shape) => shape.d));
  });

  it("wraps a very long name instead of overflowing next to the avatar", () => {
    const longName = "A".repeat(100);
    renderHeader({ profile: { ...ALICE, displayName: longName } });

    const heading = screen.getByRole("heading", { level: 2, name: longName });
    expect(heading).toHaveClass("break-words", "font-display", "text-2xl");
    expect(heading.parentElement).toHaveClass("min-w-0");
  });

  it("renders the action slot under the name and above the progress", () => {
    renderHeader({ action: <button type="button">Modifier</button> });

    const heading = screen.getByRole("heading", { level: 2, name: "Alice" });
    const action = screen.getByRole("button", { name: "Modifier" });
    const bar = screen.getByRole("progressbar", { name: "Progression" });
    expect(heading.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(action.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders no action when none is given, only the two counter buttons", () => {
    renderHeader();

    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["0 abonné", "2 abonnements"]);
  });

  it("opens the followers of the shown profile from the first counter", async () => {
    (ProfileService.getFollowers as Mock).mockResolvedValue([]);
    renderHeader({ profile: { ...ALICE, id: 7, followerCount: 2 } });

    await userEvent.setup().click(screen.getByRole("button", { name: "2 abonnés" }));

    expect(await screen.findByRole("dialog", { name: "Abonnés de Alice" })).toBeInTheDocument();
    expect(ProfileService.getFollowers).toHaveBeenCalledWith(7);
    expect(ProfileService.getFollowing).not.toHaveBeenCalled();
  });

  it("opens the followed users of the shown profile from the second counter", async () => {
    (ProfileService.getFollowing as Mock).mockResolvedValue([]);
    renderHeader({ profile: { ...ALICE, id: 7 } });

    await userEvent.setup().click(screen.getByRole("button", { name: "2 abonnements" }));

    expect(await screen.findByRole("dialog", { name: "Abonnements de Alice" })).toBeInTheDocument();
    expect(ProfileService.getFollowing).toHaveBeenCalledWith(7);
    expect(ProfileService.getFollowers).not.toHaveBeenCalled();
  });

  it("shows no counter button while loading or on error", () => {
    renderHeader({ profile: null, isError: true });

    expect(screen.queryByRole("button", { name: /abonn/ })).not.toBeInTheDocument();
  });

  it("shows a busy skeleton while the profile loads, without data or alert", () => {
    const { container } = renderHeader({ profile: null, isPending: true });

    expect(screen.getByTestId("profile-header-skeleton")).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll("[data-testid='profile-header-skeleton'] .skeleton").length).toBeGreaterThan(0);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("prefers the skeleton over a stale error while the profile reloads", () => {
    renderHeader({ profile: null, isPending: true, isError: true });

    expect(screen.getByTestId("profile-header-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an alert with a retry button on error and calls onRetry", async () => {
    renderHeader({ profile: null, isError: true });

    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger le profil");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Réessayer" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows the same alert when the profile is unknown", () => {
    renderHeader({ profile: null });

    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger le profil");
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });
});
