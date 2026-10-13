import { toast } from "@heroui/react";
import BeerStyleService from "@/api/beerStyles/beerStyleService";
import { HttpError } from "@/api/httpError";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { BEER_STYLES } from "@/utils/apiURL/apiURL";

vi.mock("@heroui/react", () => ({
  toast: { danger: vi.fn() },
}));

const mockFetch = vi.fn();

const groupsDto = [
  {
    family: "trappist",
    styles: [
      { id: 12, name: "Trappiste Blonde", description: "Une blonde." },
      { id: 13, name: "Trappiste Triple", description: "Une triple." },
    ],
  },
  { family: "mead", styles: [{ id: 99, name: "Hydromel", description: "Du miel." }] },
  { family: "ipa", styles: [] },
];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("BeerStyleService.getGroups", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the beer styles route with a GET", async () => {
    mockFetch.mockImplementation(async () => json(groupsDto));

    await BeerStyleService.getGroups();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(BEER_STYLES());
    expect(init.method).toBe("GET");
  });

  it("returns the groups as models, dropping a group of an unknown family", async () => {
    mockFetch.mockImplementation(async () => json(groupsDto));

    const groups = await BeerStyleService.getGroups();

    expect(groups).toEqual([
      { family: BeerFamilyEnum.TRAPPIST, styles: groupsDto[0].styles },
      { family: BeerFamilyEnum.IPA, styles: [] },
    ]);
  });

  it("returns an empty list on a 204 answer", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(BeerStyleService.getGroups()).resolves.toEqual([]);
  });

  it("returns an empty list on a 200 answer with a null body, without a toast", async () => {
    mockFetch.mockImplementation(async () => json(null));

    await expect(BeerStyleService.getGroups()).resolves.toEqual([]);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("returns an empty list on an empty array", async () => {
    mockFetch.mockImplementation(async () => json([]));

    await expect(BeerStyleService.getGroups()).resolves.toEqual([]);
  });

  it.each([401, 500])("rejects with the HttpError on status %s and shows no toast", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = BeerStyleService.getGroups();

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on a network failure and shows no toast", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(BeerStyleService.getGroups()).rejects.toThrow("Failed to fetch");
    expect(toast.danger).not.toHaveBeenCalled();
  });
});
