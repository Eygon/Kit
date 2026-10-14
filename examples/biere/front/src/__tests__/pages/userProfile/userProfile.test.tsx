import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import type { Mock } from "vitest";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import CollectionService from "@/api/collections/collectionService";
import ProfileService from "@/api/profiles/profileService";
import { getAvatarArtwork } from "@/components/elements/userAvatar/utils/avatarArtworks";
import { UserProfilePage } from "@/pages/userProfile/userProfile";
import { CollectionKindEnum } from "@/types/enums/collection/collectionKindEnum";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";
import type { Profile } from "@/types/models/profile/profile";

vi.mock("@/api/profiles/profileService", () => ({
  default: { getProfile: vi.fn(), follow: vi.fn(), unfollow: vi.fn() },
}));

vi.mock("@/api/collections/collectionService", () => ({
  default: { getForUser: vi.fn() },
}));

const buildProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 2,
  displayName: "Bob",
  avatar: AvatarEnum.GLASS,
  level: 2,
  title: LevelTitleEnum.TASTER,
  discoveredCount: 12,
  currentThreshold: 10,
  nextThreshold: 20,
  nextTitle: LevelTitleEnum.HOP_HEAD,
  followerCount: 3,
  followingCount: 1,
  isFollowed: false,
  isMe: false,
  ...overrides,
});

const renderUserProfile = (path: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/profils/:userId" element={<UserProfilePage />} />
      <Route path="/profil" element={<p>Ma page profil</p>} />
    </Routes>,
    { initialPath: path },
  );

describe("UserProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ProfileService.getProfile as Mock).mockResolvedValue(buildProfile());
    (CollectionService.getForUser as Mock).mockResolvedValue([
      { id: 5, kind: CollectionKindEnum.CUSTOM, name: "Trappistes", beerCount: 1 },
    ]);
  });

  it("shows the card of Bob with the Follow button in its state", async () => {
    renderUserProfile("/profils/2");

    expect(await screen.findByRole("heading", { level: 1, name: "Bob" })).toBeInTheDocument();
    expect(ProfileService.getProfile).toHaveBeenCalledWith(2);
    expect(screen.getByRole("heading", { level: 2, name: "Bob" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /Progression/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suivre Bob" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the level, the title, the progress and the counters of Bob in his card", async () => {
    const { container } = renderUserProfile("/profils/2");

    await screen.findByRole("heading", { level: 2, name: "Bob" });
    expect(screen.getByText("Niv. 2 · Dégustateur")).toBeInTheDocument();
    const progress = screen.getByRole("progressbar", { name: "Progression" });
    expect(progress).toHaveAttribute("aria-valuetext", "12 / 20 pour Houblonneur");
    expect(progress).toHaveAttribute("aria-valuemin", "10");
    expect(progress).toHaveAttribute("aria-valuemax", "20");
    expect(progress).toHaveAttribute("aria-valuenow", "12");
    expect(screen.getByRole("button", { name: "3 abonnés" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 abonnement" })).toBeInTheDocument();
    const paths = Array.from(container.querySelectorAll("svg[aria-hidden='true'] path"));
    expect(paths.map((path) => path.getAttribute("d"))).toEqual(getAvatarArtwork(AvatarEnum.GLASS).shapes.map((shape) => shape.d));
  });

  it("shows the button pressed when I already follow Bob", async () => {
    (ProfileService.getProfile as Mock).mockResolvedValue(buildProfile({ isFollowed: true }));
    renderUserProfile("/profils/2");

    expect(await screen.findByRole("button", { name: "Suivre Bob" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Suivre Bob" })).toHaveTextContent("Suivi");
  });

  it("follows Bob when the button is pressed", async () => {
    (ProfileService.follow as Mock).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderUserProfile("/profils/2");

    await user.click(await screen.findByRole("button", { name: "Suivre Bob" }));

    await waitFor(() => expect(ProfileService.follow).toHaveBeenCalledWith(2));
  });

  it("shows skeletons while the profile loads", async () => {
    (ProfileService.getProfile as Mock).mockReturnValue(new Promise(() => undefined));
    renderUserProfile("/profils/2");

    expect(screen.getByTestId("profile-header-skeleton")).toBeInTheDocument();
  });

  it("shows the retry alert when the server fails and reads again on retry", async () => {
    (ProfileService.getProfile as Mock).mockRejectedValueOnce(new Error("boom"));
    const user = userEvent.setup();
    renderUserProfile("/profils/2");

    expect(await screen.findByRole("alert")).toHaveTextContent("Impossible de charger le profil");
    expect(screen.queryByText("Profil introuvable")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Bob" })).toBeInTheDocument();
    expect(ProfileService.getProfile).toHaveBeenCalledTimes(2);
  });

  it.each(["abc", "0", "-3", "2x"])("tells the profile is not found for the id %s without any request", async (id) => {
    const { container } = renderUserProfile(`/profils/${id}`);
    const mascot = container.querySelector('[data-slot="mascot"]');
    expect(mascot).not.toBeNull();
    expect(mascot).toHaveAttribute("data-mood", MascotMoodEnum.CONFUSED);

    expect(screen.getByRole("heading", { level: 2, name: "Profil introuvable" })).toBeInTheDocument();
    expect(screen.getByText("Ce profil n'existe pas ou plus.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir les profils" })).toHaveAttribute("href", "/profils");
    expect(ProfileService.getProfile).not.toHaveBeenCalled();
  });

  it("tells the profile is not found when the server has no such user", async () => {
    (ProfileService.getProfile as Mock).mockResolvedValue(null);
    const { container } = renderUserProfile("/profils/999");

    expect(await screen.findByRole("heading", { level: 2, name: "Profil introuvable" })).toBeInTheDocument();
    const mascot = container.querySelector('[data-slot="mascot"]');
    expect(mascot).not.toBeNull();
    expect(mascot).toHaveAttribute("data-mood", MascotMoodEnum.CONFUSED);
    expect(screen.getByRole("link", { name: "Voir les profils" })).toHaveAttribute("href", "/profils");
    expect(screen.queryByRole("button", { name: /Suivre/ })).not.toBeInTheDocument();
  });

  it("redirects to my own profile page when the profile is mine", async () => {
    (ProfileService.getProfile as Mock).mockResolvedValue(buildProfile({ id: 1, displayName: "Alice", isMe: true }));
    renderUserProfile("/profils/1");

    expect(await screen.findByText("Ma page profil")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Suivre/ })).not.toBeInTheDocument();
  });

  it("invites to follow Bob instead of showing his collections, without any collections request", async () => {
    renderUserProfile("/profils/2");

    expect(await screen.findByText("Suivez Bob pour voir ses collections")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Mes collections" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Trappistes" })).not.toBeInTheDocument();
    expect(CollectionService.getForUser).not.toHaveBeenCalled();
  });

  it("shows the collections of Bob when I already follow him", async () => {
    (ProfileService.getProfile as Mock).mockResolvedValue(buildProfile({ isFollowed: true }));
    renderUserProfile("/profils/2");

    expect(await screen.findByRole("link", { name: "Trappistes" })).toHaveAttribute("href", "/profils/2/collections/5");
    expect(screen.getByRole("heading", { level: 2, name: "Collections de Bob" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mes collections" })).not.toBeInTheDocument();
    expect(CollectionService.getForUser).toHaveBeenCalledWith(2);
    expect(screen.queryByText("Suivez Bob pour voir ses collections")).not.toBeInTheDocument();
  });

  it("shows the collections once I follow Bob", async () => {
    (ProfileService.follow as Mock).mockImplementation(async () => {
      (ProfileService.getProfile as Mock).mockResolvedValue(buildProfile({ isFollowed: true }));
    });
    const user = userEvent.setup();
    renderUserProfile("/profils/2");

    await user.click(await screen.findByRole("button", { name: "Suivre Bob" }));

    expect(await screen.findByRole("link", { name: "Trappistes" })).toBeInTheDocument();
    expect(screen.queryByText("Suivez Bob pour voir ses collections")).not.toBeInTheDocument();
    expect(CollectionService.getForUser).toHaveBeenCalledWith(2);
  });

  it("shows neither the invitation nor the collections while the profile loads or is unknown", async () => {
    (ProfileService.getProfile as Mock).mockResolvedValue(null);
    renderUserProfile("/profils/999");

    expect(await screen.findByRole("heading", { level: 2, name: "Profil introuvable" })).toBeInTheDocument();
    expect(screen.queryByText(/pour voir ses collections/)).not.toBeInTheDocument();
    expect(CollectionService.getForUser).not.toHaveBeenCalled();
  });

  it("reads the collections again when the retry of their alert is pressed", async () => {
    (ProfileService.getProfile as Mock).mockResolvedValue(buildProfile({ isFollowed: true }));
    (CollectionService.getForUser as Mock).mockRejectedValueOnce(new Error("boom"));
    const user = userEvent.setup();
    renderUserProfile("/profils/2");

    expect(await screen.findByRole("alert")).toHaveTextContent("Collections indisponibles.");
    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(await screen.findByRole("link", { name: "Trappistes" })).toBeInTheDocument();
    expect(CollectionService.getForUser).toHaveBeenCalledTimes(2);
  });
});
