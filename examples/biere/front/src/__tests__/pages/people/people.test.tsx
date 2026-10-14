import { toast } from "@heroui/react";
import { QueryClient } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import ProfileService from "@/api/profiles/profileService";
import { PeoplePage } from "@/pages/people/people";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";
import type { Profile } from "@/types/models/profile/profile";
import type { ProfileSummary } from "@/types/models/profile/profileSummary";
import { feedKeys } from "@/utils/queryKeys/feedQueryKeys";

vi.mock("@/api/profiles/profileService", () => ({
  default: { getAll: vi.fn(), follow: vi.fn(), unfollow: vi.fn() },
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

const THREE_PROFILES = [buildProfile(1, "Alice", { isMe: true }), buildProfile(2, "Bob"), buildProfile(3, "Carol", { discoveredCount: 1 })];

describe("PeoplePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ProfileService.getAll as Mock).mockResolvedValue(THREE_PROFILES);
  });

  it("shows the Profils title and three rows in the order received, with my row marked You", async () => {
    renderWithProviders(<PeoplePage />, { initialPath: "/profils" });

    expect(screen.getByRole("heading", { level: 1, name: "Profils" })).toBeInTheDocument();
    expect(screen.getByText("Les amateurs de Mousse à suivre.")).toBeInTheDocument();
    const rows = await screen.findAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => within(row).getByRole("link").textContent)).toEqual(["Alice", "Bob", "Carol"]);
    expect(rows[0]).toHaveTextContent("Niv. 2 · Dégustateur");
    expect(rows[1]).toHaveTextContent("12 bières découvertes");
    expect(rows[2]).toHaveTextContent("1 bière découverte");
    expect(within(rows[0]).getByText("Vous")).toBeInTheDocument();
    expect(screen.getAllByText("Vous")).toHaveLength(1);
    expect(within(rows[1]).getByRole("link", { name: "Bob" })).toHaveAttribute("href", "/profils/2");
  });

  it("shows skeletons and no list while loading", () => {
    (ProfileService.getAll as Mock).mockReturnValue(new Promise(() => undefined));
    const { container } = renderWithProviders(<PeoplePage />);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a danger alert with Réessayer on error and loads the list on retry", async () => {
    (ProfileService.getAll as Mock).mockRejectedValueOnce(new Error("down"));
    const user = userEvent.setup();
    renderWithProviders(<PeoplePage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Impossible de charger les profils");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));

    expect(await screen.findAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(ProfileService.getAll).toHaveBeenCalledTimes(2);
  });

  it("shows the empty state panel and no list when there is no profile", async () => {
    (ProfileService.getAll as Mock).mockResolvedValue([]);
    renderWithProviders(<PeoplePage />);

    expect(await screen.findByRole("heading", { level: 2, name: "Aucun profil pour le moment" })).toBeInTheDocument();
    expect(screen.getByText("Les amateurs de Mousse apparaîtront ici.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the alert when the retry fails again", async () => {
    (ProfileService.getAll as Mock).mockRejectedValue(new Error("down"));
    const user = userEvent.setup();
    renderWithProviders(<PeoplePage />, { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) });

    await user.click(within(await screen.findByRole("alert")).getByRole("button", { name: "Réessayer" }));

    await waitFor(() => expect(ProfileService.getAll).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

describe("PeoplePage follow buttons", () => {
  const followedProfile = { id: 2, displayName: "Bob", isFollowed: true } as Profile;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
    (ProfileService.getAll as Mock).mockResolvedValue(THREE_PROFILES);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a Suivre button on every row but mine", async () => {
    renderWithProviders(<PeoplePage />);

    const rows = await screen.findAllByRole("listitem");
    expect(within(rows[0]).queryByRole("button")).not.toBeInTheDocument();
    expect(within(rows[1]).getByRole("button", { name: "Suivre Bob" })).toHaveAttribute("aria-pressed", "false");
    expect(within(rows[2]).getByRole("button", { name: "Suivre Carol" })).toHaveTextContent("Suivre");
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("shows Suivi, pressed, on a row already followed", async () => {
    (ProfileService.getAll as Mock).mockResolvedValue([buildProfile(2, "Bob", { isFollowed: true })]);
    renderWithProviders(<PeoplePage />);

    const button = await screen.findByRole("button", { name: "Suivre Bob" });
    expect(button).toHaveTextContent("Suivi");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("follows Bob: the button becomes Suivi pressed, a message appears and the feed is refreshed", async () => {
    (ProfileService.follow as Mock).mockResolvedValue(followedProfile);
    (ProfileService.getAll as Mock)
      .mockResolvedValueOnce(THREE_PROFILES)
      .mockResolvedValue([THREE_PROFILES[0], buildProfile(2, "Bob", { isFollowed: true }), THREE_PROFILES[2]]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const user = userEvent.setup();
    renderWithProviders(<PeoplePage />, { queryClient });

    await user.click(await screen.findByRole("button", { name: "Suivre Bob" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Suivre Bob" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByRole("button", { name: "Suivre Bob" })).toHaveTextContent("Suivi");
    expect(screen.getByRole("button", { name: "Suivre Carol" })).toHaveAttribute("aria-pressed", "false");
    expect(ProfileService.follow).toHaveBeenCalledTimes(1);
    expect(ProfileService.follow).toHaveBeenCalledWith(2);
    expect(toast.success).toHaveBeenCalledWith("Vous suivez Bob");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: feedKeys.all() });
  });

  it("unfollows Bob: the button goes back to Suivre and a message appears", async () => {
    (ProfileService.getAll as Mock)
      .mockResolvedValueOnce([buildProfile(2, "Bob", { isFollowed: true })])
      .mockResolvedValue([buildProfile(2, "Bob", { isFollowed: false })]);
    (ProfileService.unfollow as Mock).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<PeoplePage />);

    await user.click(await screen.findByRole("button", { name: "Suivre Bob" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Suivre Bob" })).toHaveAttribute("aria-pressed", "false"));
    expect(screen.getByRole("button", { name: "Suivre Bob" })).toHaveTextContent("Suivre");
    expect(ProfileService.unfollow).toHaveBeenCalledWith(2);
    expect(ProfileService.follow).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Vous ne suivez plus Bob");
  });

  it("sends nothing more on a second press while the first is in flight, and the button is disabled", async () => {
    let resolve!: (value: Profile) => void;
    (ProfileService.follow as Mock).mockReturnValue(new Promise<Profile>((res) => (resolve = res)));
    const user = userEvent.setup();
    renderWithProviders(<PeoplePage />);

    const button = await screen.findByRole("button", { name: "Suivre Bob" });
    await user.click(button);
    await waitFor(() => expect(screen.getByRole("button", { name: "Suivre Bob" })).toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Suivre Bob" }));

    expect(ProfileService.follow).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Suivre Carol" })).toBeEnabled();
    resolve(followedProfile);
    await waitFor(() => expect(screen.getByRole("button", { name: "Suivre Bob" })).toBeEnabled());
  });

  it("puts the button back to Suivre with no success message when the server fails", async () => {
    (ProfileService.follow as Mock).mockRejectedValue(new Error("down"));
    const user = userEvent.setup();
    renderWithProviders(<PeoplePage />);

    await user.click(await screen.findByRole("button", { name: "Suivre Bob" }));

    await waitFor(() => expect(ProfileService.follow).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: "Suivre Bob" })).toBeEnabled());
    expect(screen.getByRole("button", { name: "Suivre Bob" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Suivre Bob" })).toHaveTextContent("Suivre");
    expect(toast.success).not.toHaveBeenCalled();
  });
});
