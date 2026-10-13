import type { Mock } from "vitest";
import WishlistService from "@/api/wishlist/wishlistService";
import { addToWishlist, removeFromWishlist } from "@/utils/queryFunctions/wishlistQueryFunctions";

vi.mock("@/api/wishlist/wishlistService", () => ({
  default: { add: vi.fn(), remove: vi.fn() },
}));

describe("wishlist query functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("addToWishlist delegates to WishlistService.add and returns the item", async () => {
    const item = { beerId: 7, beerName: "Orval", addedAt: "2026-10-12T12:00:00.000Z" };
    (WishlistService.add as Mock).mockResolvedValue(item);

    const result = await addToWishlist(7);

    expect(WishlistService.add).toHaveBeenCalledTimes(1);
    expect(WishlistService.add).toHaveBeenCalledWith(7);
    expect(result).toBe(item);
  });

  it("removeFromWishlist delegates to WishlistService.remove", async () => {
    (WishlistService.remove as Mock).mockResolvedValue(undefined);

    await removeFromWishlist(7);

    expect(WishlistService.remove).toHaveBeenCalledTimes(1);
    expect(WishlistService.remove).toHaveBeenCalledWith(7);
  });

  it("lets the service rejections through", async () => {
    (WishlistService.add as Mock).mockRejectedValue(new Error("conflict"));
    (WishlistService.remove as Mock).mockRejectedValue(new Error("down"));

    await expect(addToWishlist(7)).rejects.toThrow("conflict");
    await expect(removeFromWishlist(7)).rejects.toThrow("down");
  });
});
