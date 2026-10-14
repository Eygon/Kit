import { AVATAR_ARTWORKS, getAvatarArtwork } from "@/components/elements/userAvatar/utils/avatarArtworks";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";

const TOKEN_CLASS = /^(fill-(accent|secondary|highlight|surface|background)|stroke-foreground)$/;

describe("avatarArtworks", () => {
  it("draws one artwork per avatar, in enum order", () => {
    expect(AVATAR_ARTWORKS.map((artwork) => artwork.avatar)).toEqual(Object.values(AvatarEnum));
  });

  it("gives every avatar a distinct drawing", () => {
    const drawings = AVATAR_ARTWORKS.map((artwork) => artwork.shapes.map((shape) => shape.d).join("|"));
    expect(new Set(drawings).size).toBe(12);
  });

  it("paints shapes with design tokens only", () => {
    AVATAR_ARTWORKS.forEach((artwork) => {
      expect(artwork.shapes.length).toBeGreaterThan(0);
      artwork.shapes.forEach((shape) => {
        expect(shape.d).not.toBe("");
        shape.className.split(" ").forEach((token) => expect(token).toMatch(TOKEN_CLASS));
        expect(shape.className.split(" ")).toContain("stroke-foreground");
        expect(shape.className.split(" ").filter((token) => token.startsWith("fill-"))).toHaveLength(1);
      });
    });
  });

  it("returns the artwork of the requested avatar", () => {
    expect(getAvatarArtwork(AvatarEnum.PRETZEL)).toBe(AVATAR_ARTWORKS[11]);
    expect(getAvatarArtwork(AvatarEnum.MALT)).toBe(AVATAR_ARTWORKS[1]);
  });

  it("falls back to the hop artwork for an unknown identifier", () => {
    expect(getAvatarArtwork("unicorn")).toBe(AVATAR_ARTWORKS[0]);
    expect(AVATAR_ARTWORKS[0].avatar).toBe("hop");
  });
});
