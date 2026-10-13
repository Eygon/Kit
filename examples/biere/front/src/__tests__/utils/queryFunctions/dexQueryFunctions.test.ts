import type { Mock } from "vitest";
import DexService from "@/api/dex/dexService";
import { fetchDex } from "@/utils/queryFunctions/dexQueryFunctions";

vi.mock("@/api/dex/dexService", () => ({
  default: { get: vi.fn() },
}));

describe("fetchDex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to DexService.get and returns its dex", async () => {
    const dex = { discovered: 42, total: 120, families: [], beers: [] };
    (DexService.get as Mock).mockResolvedValue(dex);

    const result = await fetchDex();

    expect(DexService.get).toHaveBeenCalledTimes(1);
    expect(result).toBe(dex);
  });

  it("lets the service rejection through", async () => {
    (DexService.get as Mock).mockRejectedValue(new Error("down"));

    await expect(fetchDex()).rejects.toThrow("down");
  });
});
