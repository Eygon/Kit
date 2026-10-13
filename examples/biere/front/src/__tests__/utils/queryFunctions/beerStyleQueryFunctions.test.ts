import type { Mock } from "vitest";
import BeerStyleService from "@/api/beerStyles/beerStyleService";
import { fetchBeerStyleGroups } from "@/utils/queryFunctions/beerStyleQueryFunctions";

vi.mock("@/api/beerStyles/beerStyleService", () => ({
  default: { getGroups: vi.fn() },
}));

describe("fetchBeerStyleGroups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to BeerStyleService.getGroups and returns its groups", async () => {
    const groups = [{ family: "trappist", styles: [{ id: 1, name: "Dubbel", description: "" }] }];
    (BeerStyleService.getGroups as Mock).mockResolvedValue(groups);

    const result = await fetchBeerStyleGroups();

    expect(BeerStyleService.getGroups).toHaveBeenCalledTimes(1);
    expect(result).toBe(groups);
  });

  it("lets the service rejection through", async () => {
    (BeerStyleService.getGroups as Mock).mockRejectedValue(new Error("down"));

    await expect(fetchBeerStyleGroups()).rejects.toThrow("down");
  });
});
