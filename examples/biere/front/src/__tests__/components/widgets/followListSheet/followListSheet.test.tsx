import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { getAvatarArtwork } from "@/components/elements/userAvatar/utils/avatarArtworks";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import ProfileService from "@/api/profiles/profileService";
import { FollowListSheet } from "@/components/widgets/followListSheet/followListSheet";
import i18n from "@/i18n/i18n";
import type { FollowListSheetProps } from "@/types/components/followListSheet";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { FollowListKindEnum } from "@/types/enums/user/followListKindEnum";
import { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";
import type { ProfileSummary } from "@/types/models/profile/profileSummary";

vi.mock("@/api/profiles/profileService", () => ({
  default: { getFollowers: vi.fn(), getFollowing: vi.fn(), getAll: vi.fn(), follow: vi.fn(), unfollow: vi.fn() },
}));

const buildProfile = (id: number, displayName: string, overrides: Partial<ProfileSummary> = {}): ProfileSummary => ({
  id,
  displayName,
  avatar: AvatarEnum.GLASS,
  level: 2,
  title: LevelTitleEnum.TASTER,
  discoveredCount: 12,
  isFollowed: false,
  isMe: false,
  ...overrides,
});

const ALICE_AND_BOB = [buildProfile(1, "Alice", { isMe: true }), buildProfile(2, "Bob")];

const renderSheet = (props: Partial<FollowListSheetProps> = {}) =>
  renderWithProviders(
    <FollowListSheet userId={3} displayName="Carol" kind={FollowListKindEnum.FOLLOWERS} label="2 abonnés" {...props} />,
  );

const openSheet = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "2 abonnés" }));
  return user;
};

describe("FollowListSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ProfileService.getFollowers as Mock).mockResolvedValue(ALICE_AND_BOB);
    (ProfileService.getFollowing as Mock).mockResolvedValue(ALICE_AND_BOB);
  });

  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("shows only the counter button and reads nothing while closed", async () => {
    renderSheet();

    expect(screen.getByRole("button", { name: "2 abonnés" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await Promise.resolve();
    expect(ProfileService.getFollowers).not.toHaveBeenCalled();
  });

  it("lists Alice marked Vous without a button and Bob with Suivre, each name leading to its profile", async () => {
    renderSheet();
    await openSheet();

    const dialog = await screen.findByRole("dialog", { name: "Abonnés de Carol" });
    const rows = await within(dialog).findAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole("link", { name: "Alice" })).toHaveAttribute("href", "/profils/1");
    expect(within(rows[0]).getByText("Vous")).toBeInTheDocument();
    expect(within(rows[0]).queryByRole("button")).not.toBeInTheDocument();
    expect(within(rows[1]).getByRole("link", { name: "Bob" })).toHaveAttribute("href", "/profils/2");
    expect(within(rows[1]).queryByText("Vous")).not.toBeInTheDocument();
    expect(within(rows[1]).getByRole("button", { name: "Suivre Bob" })).toHaveAttribute("aria-pressed", "false");
    expect(ProfileService.getFollowers).toHaveBeenCalledWith(3);
  });

  it("shows the avatar, the level and the title of each profile in its row", async () => {
    (ProfileService.getFollowers as Mock).mockResolvedValue([
      buildProfile(1, "Alice", { isMe: true, avatar: AvatarEnum.HOP, level: 4, title: LevelTitleEnum.FINE_PALATE }),
      buildProfile(2, "Bob"),
    ]);
    renderSheet();
    await openSheet();

    const dialog = await screen.findByRole("dialog", { name: "Abonnés de Carol" });
    const rows = await within(dialog).findAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Niv. 4 · Fin palais");
    expect(rows[1]).toHaveTextContent("Niv. 2 · Dégustateur");
    const drawnBy = (row: HTMLElement) => Array.from(row.querySelectorAll("svg path")).map((path) => path.getAttribute("d"));
    expect(drawnBy(rows[0])).toEqual(getAvatarArtwork(AvatarEnum.HOP).shapes.map((shape) => shape.d));
    expect(drawnBy(rows[1])).toEqual(getAvatarArtwork(AvatarEnum.GLASS).shapes.map((shape) => shape.d));
  });

  it("titles the following list Abonnements de Carol and reads the followed users", async () => {
    renderSheet({ kind: FollowListKindEnum.FOLLOWING, label: "2 abonnements" });
    await userEvent.setup().click(screen.getByRole("button", { name: "2 abonnements" }));

    const dialog = await screen.findByRole("dialog", { name: "Abonnements de Carol" });
    expect(await within(dialog).findAllByRole("listitem")).toHaveLength(2);
    expect(ProfileService.getFollowing).toHaveBeenCalledWith(3);
    expect(ProfileService.getFollowers).not.toHaveBeenCalled();
  });

  it("writes the titles in english", async () => {
    await i18n.changeLanguage("en");
    renderSheet({ label: "2 followers" });
    await userEvent.setup().click(screen.getByRole("button", { name: "2 followers" }));

    expect(await screen.findByRole("dialog", { name: "Carol's followers" })).toBeInTheDocument();
  });

  it("writes the following title in english", async () => {
    await i18n.changeLanguage("en");
    renderSheet({ kind: FollowListKindEnum.FOLLOWING, label: "2 following" });
    await userEvent.setup().click(screen.getByRole("button", { name: "2 following" }));

    expect(await screen.findByRole("dialog", { name: "Followed by Carol" })).toBeInTheDocument();
  });

  it("shows busy skeletons while the list loads, without list, empty text or alert", async () => {
    (ProfileService.getFollowers as Mock).mockReturnValue(new Promise(() => undefined));
    renderSheet();
    await openSheet();

    const dialog = await screen.findByRole("dialog", { name: "Abonnés de Carol" });
    const busy = dialog.querySelector("[aria-busy='true']");
    expect(busy).not.toBeNull();
    expect(busy?.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
    expect(within(dialog).queryByRole("listitem")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Aucun profil pour l'instant")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says Aucun profil pour l'instant when nobody is listed", async () => {
    (ProfileService.getFollowers as Mock).mockResolvedValue([]);
    renderSheet();
    await openSheet();

    const dialog = await screen.findByRole("dialog", { name: "Abonnés de Carol" });
    expect(await within(dialog).findByText("Aucun profil pour l'instant")).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { level: 2, name: "Aucun profil pour l'instant" })).toBeInTheDocument();
    expect(within(dialog).getByText("Les profils apparaîtront ici.")).toBeInTheDocument();
    expect(within(dialog).queryByRole("listitem")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an alert with Réessayer on error and loads the list when retried", async () => {
    (ProfileService.getFollowers as Mock).mockRejectedValueOnce(new Error("down")).mockResolvedValue(ALICE_AND_BOB);
    renderSheet();
    const user = await openSheet();

    const dialog = await screen.findByRole("dialog", { name: "Abonnés de Carol" });
    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger la liste");
    expect(within(dialog).queryByRole("listitem")).not.toBeInTheDocument();

    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));

    expect(await within(dialog).findAllByRole("listitem")).toHaveLength(2);
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    expect(ProfileService.getFollowers).toHaveBeenCalledTimes(2);
  });

  it("writes the error and empty states in english", async () => {
    await i18n.changeLanguage("en");
    (ProfileService.getFollowers as Mock).mockRejectedValue(new Error("down"));
    renderSheet({ label: "2 followers" });
    await userEvent.setup().click(screen.getByRole("button", { name: "2 followers" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the list");
  });

  it("writes the empty state in english", async () => {
    await i18n.changeLanguage("en");
    (ProfileService.getFollowers as Mock).mockResolvedValue([]);
    renderSheet({ label: "2 followers" });
    await userEvent.setup().click(screen.getByRole("button", { name: "2 followers" }));

    expect(await screen.findByText("No profile yet")).toBeInTheDocument();
    expect(screen.getByText("Profiles will show up here.")).toBeInTheDocument();
  });

  it("follows a listed user from the sheet and shows him followed after the reload", async () => {
    (ProfileService.follow as Mock).mockResolvedValue({ id: 2 });
    (ProfileService.getFollowers as Mock)
      .mockResolvedValueOnce(ALICE_AND_BOB)
      .mockResolvedValue([ALICE_AND_BOB[0], buildProfile(2, "Bob", { isFollowed: true })]);
    renderSheet();
    const user = await openSheet();

    await user.click(await screen.findByRole("button", { name: "Suivre Bob" }));

    expect(ProfileService.follow).toHaveBeenCalledWith(2);
    await waitFor(() => expect(screen.getByRole("button", { name: "Suivre Bob" })).toHaveAttribute("aria-pressed", "true"));
  });

  it("keeps a long unbroken name inside a scrolling, width-bounded list", async () => {
    const longName = "B".repeat(100);
    (ProfileService.getFollowers as Mock).mockResolvedValue([buildProfile(2, longName)]);
    renderSheet();
    await openSheet();

    const link = await screen.findByRole("link", { name: longName });
    expect(link).toHaveClass("break-words");
    const list = screen.getByRole("list");
    expect(list.parentElement).toHaveClass("overflow-y-auto", "min-w-0");
  });
});
