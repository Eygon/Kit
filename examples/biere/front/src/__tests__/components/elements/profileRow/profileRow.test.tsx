import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { getAvatarArtwork } from "@/components/elements/userAvatar/utils/avatarArtworks";
import { ProfileRow } from "@/components/elements/profileRow/profileRow";
import type { ProfileRowProps } from "@/types/components/profileRow";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";
import type { ProfileSummary } from "@/types/models/profile/profileSummary";

const buildProfile = (overrides: Partial<ProfileSummary> = {}): ProfileSummary => ({
  id: 2,
  displayName: "Bob",
  avatar: AvatarEnum.GLASS,
  level: 2,
  title: LevelTitleEnum.TASTER,
  discoveredCount: 12,
  isFollowed: false,
  isMe: false,
  ...overrides,
});

const renderRow = (props: Partial<ProfileRowProps> = {}) =>
  renderWithProviders(
    <ul>
      <ProfileRow profile={buildProfile()} {...props} />
    </ul>,
  );

describe("ProfileRow", () => {
  it("renders a list item with the name, the level and the discovered count", () => {
    renderRow();

    const item = screen.getByRole("listitem");
    expect(within(item).getByRole("link", { name: "Bob" })).toBeInTheDocument();
    expect(item).toHaveTextContent("Niv. 2 · Dégustateur");
    expect(item).toHaveTextContent("12 bières découvertes");
    expect(item).toHaveClass("rounded-mousse", "border-mousse", "bg-surface", "shadow-mousse");
  });

  it("links the name to the profile page of the user", () => {
    renderRow({ profile: buildProfile({ id: 7 }) });

    expect(screen.getByRole("link", { name: "Bob" })).toHaveAttribute("href", "/profils/7");
  });

  it("draws the avatar of the profile as a decorative artwork", () => {
    const { container } = renderRow();

    expect(container.querySelector(`path[d="${getAvatarArtwork(AvatarEnum.GLASS).shapes[0].d}"]`)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("uses the singular for a single discovered beer and keeps zero", () => {
    const { unmount } = renderRow({ profile: buildProfile({ discoveredCount: 1 }) });
    expect(screen.getByRole("listitem")).toHaveTextContent("1 bière découverte");
    expect(screen.getByRole("listitem")).not.toHaveTextContent("1 bières");
    unmount();

    renderRow({ profile: buildProfile({ discoveredCount: 0 }) });
    expect(screen.getByRole("listitem")).toHaveTextContent("0 bière découverte");
  });

  it("writes the level and the title with the title of the profile", () => {
    renderRow({ profile: buildProfile({ level: 6, title: LevelTitleEnum.FOAM_LEGEND }) });

    expect(screen.getByRole("listitem")).toHaveTextContent("Niv. 6 · Légende de la mousse");
  });

  it("marks my own row with the You chip and no other row", () => {
    const { unmount } = renderRow({ profile: buildProfile({ isMe: true }) });
    expect(within(screen.getByRole("listitem")).getByText("Vous")).toBeInTheDocument();
    unmount();

    renderRow();
    expect(screen.queryByText("Vous")).not.toBeInTheDocument();
  });

  it("renders the action slot when given and nothing otherwise", () => {
    const { unmount } = renderRow({ action: <button type="button">Suivre</button> });
    expect(within(screen.getByRole("listitem")).getByRole("button", { name: "Suivre" })).toBeInTheDocument();
    unmount();

    renderRow();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("lets a very long name wrap inside the row", () => {
    const longName = "A".repeat(100);
    renderRow({ profile: buildProfile({ displayName: longName }) });

    const link = screen.getByRole("link", { name: longName });
    expect(link).toHaveClass("break-words", "min-h-11");
    expect(screen.getByRole("listitem")).toHaveClass("min-w-0");
  });
});
