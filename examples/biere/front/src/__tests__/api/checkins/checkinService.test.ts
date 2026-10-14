import { toast } from "@heroui/react";
import CheckinService from "@/api/checkins/checkinService";
import { HttpError } from "@/api/httpError";
import { BeerAromaEnum } from "@/types/enums/beer/beerAromaEnum";
import type { NewCheckin } from "@/types/models/checkin/newCheckin";
import { CHECKIN_BY_ID, CHECKINS } from "@/utils/apiURL/apiURL";

vi.mock("@heroui/react", () => ({
  toast: { danger: vi.fn() },
}));

const mockFetch = vi.fn();

const checkinDto = {
  id: 11,
  beerId: 7,
  beerName: "Orval",
  drankAt: "2026-10-12T12:00:00.000Z",
  place: "Chez Paul",
  rating: 4.5,
  aromas: ["fruity", "weird"],
  format: "bottle",
  price: 3.5,
  comment: "Top",
  photoId: "6f1c0a52-8d3e-4c7b-9a1f-2b5e7d9c0a11",
  venueId: 42,
};

const pageDto = {
  items: [checkinDto, { ...checkinDto, id: 10, rating: null, format: "keg", price: null, photoId: null, venueId: null }],
  total: 25,
  page: 2,
  size: 20,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("CheckinService.getPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the checkins url from the api base", () => {
    expect(CHECKINS()).toMatch(/\/api\/v1\/checkins$/);
  });

  it("requests the beer and the page with exactly the contract parameters", async () => {
    mockFetch.mockImplementation(async () => json(pageDto));

    await CheckinService.getPage(7, 2);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${CHECKINS()}?beerId=7&page=2`);
    expect(init.method).toBe("GET");
  });

  it("omits the beer id when it is null", async () => {
    mockFetch.mockImplementation(async () => json(pageDto));

    await CheckinService.getPage(null, 1);

    expect(mockFetch.mock.calls[0][0]).toBe(`${CHECKINS()}?page=1`);
  });

  it("returns the page as models, dropping unknown aromas and formats without crashing", async () => {
    mockFetch.mockImplementation(async () => json(pageDto));

    const page = await CheckinService.getPage(7, 2);

    expect(page.total).toBe(25);
    expect(page.page).toBe(2);
    expect(page.size).toBe(20);
    expect(page.items).toHaveLength(2);
    expect(page.items[0]).toEqual({ ...checkinDto, aromas: ["fruity"] });
    expect(page.items[1]).toEqual({
      ...checkinDto,
      id: 10,
      rating: null,
      format: null,
      price: null,
      photoId: null,
      venueId: null,
      aromas: ["fruity"],
    });
  });

  it.each([400, 401, 500])("rejects with the HttpError on status %s and shows no toast", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = CheckinService.getPage(7, 1);

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on a network failure and shows no toast", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(CheckinService.getPage(7, 1)).rejects.toThrow("Failed to fetch");
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on an empty 204 answer instead of returning a page", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(CheckinService.getPage(7, 1)).rejects.toMatchObject({ status: 204 });
  });
});

describe("CheckinService.create", () => {
  const fullCheckin: NewCheckin = {
    beerId: 7,
    drankAt: "2026-10-12T12:00:00.000Z",
    place: "Chez Paul",
    venueId: 5,
    format: "bottle",
    rating: 4.5,
    aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.HOPPY],
    price: 3.5,
    comment: "Top",
  };

  const minimalCheckin: NewCheckin = {
    beerId: 7,
    drankAt: "2026-10-12T12:00:00.000Z",
    place: "Chez Paul",
    venueId: null,
    format: "can",
    rating: null,
    aromas: [],
    price: null,
    comment: "",
  };

  const createdDto = { checkin: checkinDto, isFirstDiscovery: true };

  const sentBody = () => (mockFetch.mock.calls[0][1] as RequestInit).body as FormData;

  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts a multipart form to the checkins url with a signal and no hand-set content type", async () => {
    mockFetch.mockImplementation(async () => json(createdDto, 201));

    await CheckinService.create(fullCheckin);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(CHECKINS());
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(Object.keys(init.headers as Record<string, string>).map((name) => name.toLowerCase())).not.toContain(
      "content-type",
    );
  });

  it("sends every field as a string, the drinking date untouched and the aromas comma-joined", async () => {
    mockFetch.mockImplementation(async () => json(createdDto, 201));

    await CheckinService.create(fullCheckin);

    expect(Object.fromEntries(sentBody().entries())).toEqual({
      beerId: "7",
      drankAt: "2026-10-12T12:00:00.000Z",
      place: "Chez Paul",
      venueId: "5",
      format: "bottle",
      rating: "4.5",
      aromas: "fruity,hoppy",
      price: "3.5",
      comment: "Top",
    });
  });

  it("leaves out the rating, the aromas, the price and the comment when they are not filled in", async () => {
    mockFetch.mockImplementation(async () => json(createdDto, 201));

    await CheckinService.create(minimalCheckin);

    expect(Object.fromEntries(sentBody().entries())).toEqual({
      beerId: "7",
      drankAt: "2026-10-12T12:00:00.000Z",
      place: "Chez Paul",
      format: "can",
    });
  });

  it("sends the venue id as a string only when the place is linked to a venue", async () => {
    mockFetch.mockImplementation(async () => json(createdDto, 201));

    await CheckinService.create({ ...minimalCheckin, venueId: 12 });
    expect(sentBody().get("venueId")).toBe("12");

    mockFetch.mockClear();
    await CheckinService.create(minimalCheckin);
    expect(sentBody().has("venueId")).toBe(false);
  });

  it("keeps a zero price and a zero rating, since they are filled in", async () => {
    mockFetch.mockImplementation(async () => json(createdDto, 201));

    await CheckinService.create({ ...minimalCheckin, rating: 0, price: 0 });

    expect(sentBody().get("rating")).toBe("0");
    expect(sentBody().get("price")).toBe("0");
  });

  it("appends the photo as the file part, first, before every other field", async () => {
    mockFetch.mockImplementation(async () => json(createdDto, 201));
    const photo = new File([new Uint8Array(8)], "beer.png", { type: "image/png" });

    await CheckinService.create({ ...fullCheckin, photo });

    const entries = [...sentBody().entries()];
    expect(entries[0][0]).toBe("file");
    expect(entries.filter(([name]) => name === "file")).toHaveLength(1);
    const sentFile = sentBody().get("file") as File;
    expect(sentFile).toBeInstanceOf(File);
    expect(sentFile.name).toBe("beer.png");
    expect(sentFile.type).toBe("image/png");
    expect(sentFile.size).toBe(8);
    expect(entries.slice(1).map(([name]) => name)).toEqual([
      "beerId",
      "drankAt",
      "place",
      "venueId",
      "format",
      "rating",
      "aromas",
      "price",
      "comment",
    ]);
  });

  it.each([
    ["null", null],
    ["missing", undefined],
  ])("sends no file part when the photo is %s", async (_name, photo) => {
    mockFetch.mockImplementation(async () => json(createdDto, 201));

    await CheckinService.create({ ...fullCheckin, photo });

    expect(sentBody().has("file")).toBe(false);
    expect([...sentBody().keys()][0]).toBe("beerId");
  });

  it("bounds the request with a ninety second timeout signal", async () => {
    mockFetch.mockImplementation(async () => json(createdDto, 201));
    const timeout = vi.spyOn(AbortSignal, "timeout");

    await CheckinService.create(minimalCheckin);

    expect(timeout).toHaveBeenCalledTimes(1);
    expect(timeout).toHaveBeenCalledWith(90_000);
  });

  it("returns the created checkin as a model with the first discovery flag", async () => {
    mockFetch.mockImplementation(async () => json({ checkin: { ...checkinDto, aromas: ["fruity", "weird"] }, isFirstDiscovery: false }, 201));

    const created = await CheckinService.create(fullCheckin);

    expect(created).toEqual({ checkin: { ...checkinDto, aromas: ["fruity"] }, isFirstDiscovery: false });
  });

  it.each([400, 404, 413, 500])("shows one toast then rethrows the HttpError on status %s", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = CheckinService.create(fullCheckin);

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status });
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toast.danger).mock.calls[0][0]).toEqual(expect.stringMatching(/\S/));
  });

  it("shows one toast then rethrows on a network failure", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(CheckinService.create(fullCheckin)).rejects.toThrow("Failed to fetch");
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });

  it("rejects on an empty answer instead of returning a created checkin", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(CheckinService.create(fullCheckin)).rejects.toMatchObject({ status: 204 });
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });
});

describe("CheckinService.remove", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the checkin url from the checkins url and the id", () => {
    expect(CHECKIN_BY_ID(11)).toBe(`${CHECKINS()}/11`);
  });

  it("sends a DELETE to the checkin url and resolves with nothing on 204", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    const result = await CheckinService.remove(11);

    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${CHECKINS()}/11`);
    expect(init.method).toBe("DELETE");
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([404, 500])("shows one toast then rethrows the HttpError on status %s", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = CheckinService.remove(11);

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status });
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toast.danger).mock.calls[0][0]).toEqual(expect.stringMatching(/\S/));
  });

  it("shows one toast then rethrows on a network failure", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(CheckinService.remove(11)).rejects.toThrow("Failed to fetch");
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });
});
