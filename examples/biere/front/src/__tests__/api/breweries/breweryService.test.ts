import { toast } from "@heroui/react";
import BreweryService from "@/api/breweries/breweryService";
import { BREWERIES } from "@/utils/apiURL/apiURL";

vi.mock("@heroui/react", () => ({
  toast: { danger: vi.fn() },
}));

const mockFetch = vi.fn();

const breweriesDto = [
  { id: 4, name: "Chimay", country: "BE" },
  { id: 9, name: "Brasserie d'Orval", country: "BE", extra: "ignored" },
];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("BreweryService.getAll", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the breweries route with a GET", async () => {
    mockFetch.mockImplementation(async () => json(breweriesDto));

    await BreweryService.getAll();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(BREWERIES());
    expect(init.method).toBe("GET");
  });

  it("returns the breweries as models, in the order of the answer", async () => {
    mockFetch.mockImplementation(async () => json(breweriesDto));

    await expect(BreweryService.getAll()).resolves.toEqual([
      { id: 4, name: "Chimay", country: "BE" },
      { id: 9, name: "Brasserie d'Orval", country: "BE" },
    ]);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("returns an empty list on a 204 answer without a toast", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(BreweryService.getAll()).resolves.toEqual([]);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("returns an empty list on a 200 answer with a null body, without a toast", async () => {
    mockFetch.mockImplementation(async () => json(null));

    await expect(BreweryService.getAll()).resolves.toEqual([]);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("returns an empty list on an empty array", async () => {
    mockFetch.mockImplementation(async () => json([]));

    await expect(BreweryService.getAll()).resolves.toEqual([]);
  });

  it.each([
    [401, "La demande est invalide."],
    [500, "Une erreur est survenue. Réessayez."],
  ])("returns an empty list on status %s and shows one toast", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    await expect(BreweryService.getAll()).resolves.toEqual([]);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith(expect.any(String));
    expect(vi.mocked(toast.danger).mock.calls[0][0]).not.toBe("");
  });

  it("returns an empty list on a network failure and shows one toast with the generic text", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(BreweryService.getAll()).resolves.toEqual([]);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Une erreur est survenue. Réessayez.");
  });
});
