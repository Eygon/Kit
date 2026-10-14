import type { Mock } from "vitest";
import BreweryService from "@/api/breweries/breweryService";
import { fetchBreweries } from "@/utils/queryFunctions/breweryQueryFunctions";

vi.mock("@/api/breweries/breweryService", () => ({
  default: { getAll: vi.fn() },
}));

describe("fetchBreweries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to BreweryService.getAll and returns its breweries", async () => {
    const breweries = [{ id: 4, name: "Chimay", country: "BE" }];
    (BreweryService.getAll as Mock).mockResolvedValue(breweries);

    const result = await fetchBreweries();

    expect(BreweryService.getAll).toHaveBeenCalledTimes(1);
    expect(result).toBe(breweries);
  });

  it("lets the service rejection through", async () => {
    (BreweryService.getAll as Mock).mockRejectedValue(new Error("down"));

    await expect(fetchBreweries()).rejects.toThrow("down");
  });
});
