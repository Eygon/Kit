import { toast } from "@heroui/react";
import DexService from "@/api/dex/dexService";
import { HttpError } from "@/api/httpError";
import { ME_DEX } from "@/utils/apiURL/apiURL";

vi.mock("@heroui/react", () => ({
  toast: { danger: vi.fn() },
}));

const mockFetch = vi.fn();

const dexDto = {
  discovered: 2,
  total: 120,
  families: [
    { family: "ipa", discovered: 2, total: 14 },
    { family: "mead", discovered: 0, total: 3 },
  ],
  beers: [
    { beerId: 7, firstCheckinAt: "2026-03-01T18:30:00.000Z", lastCheckinAt: "2026-04-02T20:00:00.000Z" },
    { beerId: 3, firstCheckinAt: "2026-02-01T10:00:00.000Z", lastCheckinAt: "2026-02-01T10:00:00.000Z" },
  ],
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("DexService.get", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the exact dex url with a GET", async () => {
    mockFetch.mockImplementation(async () => json(dexDto));
    await DexService.get();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ME_DEX());
    expect(url).toMatch(/\/api\/v1\/me\/dex$/);
    expect(init.method).toBe("GET");
  });

  it("returns the dex as a model, dropping unknown families without crashing", async () => {
    mockFetch.mockImplementation(async () => json(dexDto));
    const dex = await DexService.get();

    expect(dex).toEqual({
      discovered: 2,
      total: 120,
      families: [{ family: "ipa", discovered: 2, total: 14 }],
      beers: [
        { beerId: 7, firstCheckinAt: "2026-03-01T18:30:00.000Z", lastCheckinAt: "2026-04-02T20:00:00.000Z" },
        { beerId: 3, firstCheckinAt: "2026-02-01T10:00:00.000Z", lastCheckinAt: "2026-02-01T10:00:00.000Z" },
      ],
    });
  });

  it.each([401, 500])("rejects with the HttpError on status %s and shows no toast", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));
    const failure = DexService.get();

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on a network failure and shows no toast", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(DexService.get()).rejects.toThrow("Failed to fetch");
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on an empty 204 answer instead of returning a dex", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(DexService.get()).rejects.toMatchObject({ status: 204 });
    expect(toast.danger).not.toHaveBeenCalled();
  });
});
