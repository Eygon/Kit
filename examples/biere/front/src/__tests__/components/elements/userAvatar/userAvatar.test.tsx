import { screen } from "@testing-library/react";
import { UserAvatar } from "@/components/elements/userAvatar/userAvatar";
import i18n from "@/i18n/i18n";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { AvatarSizeEnum } from "@/types/enums/user/avatarSizeEnum";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const FRENCH_NAMES = ["Houblon", "Malt", "Verre", "Chope", "Bouteille", "Canette", "Tonneau", "Tireuse", "Capsule", "Mousse", "Blé", "Bretzel"];
const ENGLISH_NAMES = ["Hop", "Malt", "Glass", "Mug", "Bottle", "Can", "Barrel", "Tap", "Cap", "Foam", "Wheat", "Pretzel"];

describe("UserAvatar", () => {
  afterEach(async () => {
    await i18n.changeLanguage("fr");
  });

  it("shows a distinct illustration with an accessible name for each of the 12 avatars", () => {
    const drawings = new Set<string>();

    for (const [index, avatar] of Object.values(AvatarEnum).entries()) {
      const { unmount } = renderWithProviders(<UserAvatar avatar={avatar} />);
      const image = screen.getByRole("img", { name: `Avatar ${FRENCH_NAMES[index]}` });
      expect(image).toHaveAttribute("viewBox", "0 0 48 48");
      drawings.add(image.innerHTML);
      unmount();
    }

    expect(drawings.size).toBe(12);
  });

  it("names the avatar in english", async () => {
    await i18n.changeLanguage("en");

    for (const [index, avatar] of Object.values(AvatarEnum).entries()) {
      const { unmount } = renderWithProviders(<UserAvatar avatar={avatar} />);
      expect(screen.getByRole("img", { name: `${ENGLISH_NAMES[index]} avatar` })).toBeInTheDocument();
      unmount();
    }
  });

  it("hides a decorative avatar from screen readers", () => {
    const { container } = renderWithProviders(<UserAvatar avatar={AvatarEnum.MALT} isDecorative />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("svg")).not.toHaveAttribute("aria-label");
  });

  it("shows the hop for an unknown identifier", () => {
    const known = renderWithProviders(<UserAvatar avatar={AvatarEnum.HOP} />);
    const hopDrawing = screen.getByRole("img", { name: "Avatar Houblon" }).innerHTML;
    known.unmount();

    renderWithProviders(<UserAvatar avatar={"unicorn" as AvatarEnum} />);

    expect(screen.getByRole("img", { name: "Avatar Houblon" }).innerHTML).toBe(hopDrawing);
  });

  it("renders in the medium size by default and in the large size on request", () => {
    const medium = renderWithProviders(<UserAvatar avatar={AvatarEnum.HOP} />);
    const mediumClass = medium.container.firstElementChild?.className;
    medium.unmount();
    const large = renderWithProviders(<UserAvatar avatar={AvatarEnum.HOP} size={AvatarSizeEnum.LG} />);

    expect(AvatarSizeEnum.MD).toBe("md");
    expect(AvatarSizeEnum.LG).toBe("lg");
    expect(large.container.firstElementChild?.className).not.toBe(mediumClass);
  });
});
