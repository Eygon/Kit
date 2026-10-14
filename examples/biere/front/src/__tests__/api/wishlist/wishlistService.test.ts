import { toast } from "@heroui/react";
import WishlistService from "@/api/wishlist/wishlistService";
import { HttpError } from "@/api/httpError";
import { ME_WISHLIST, ME_WISHLIST_ITEM } from "@/utils/apiURL/apiURL";

vi.mock("@heroui/react", () => ({
  toast: { danger: vi.fn() },
}));

const mockFetch = vi.fn();

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const itemDto = { beerId: 7, beerName: "Chimay Rouge", addedAt: "2026-10-12T12:00:00.000Z" };

describe("WishlistService.add", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts { beerId } to the wishlist url and returns the item as a model", async () => {
    mockFetch.mockImplementation(async () => json(itemDto, 201));

    const item = await WishlistService.add(7);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ME_WISHLIST());
    expect(url).toMatch(/\/api\/v1\/me\/wishlist$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ beerId: 7 });
    expect(item).toEqual({ beerId: 7, beerName: "Chimay Rouge", addedAt: "2026-10-12T12:00:00.000Z" });
  });

  it("toasts once then rejects with the HttpError on a 409", async () => {
    mockFetch.mockImplementation(async () => json({ message: "Already" }, 409));

    const error: unknown = await WishlistService.add(7).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(409);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toast.danger).mock.calls[0][0]).toBeTruthy();
  });
});

describe("WishlistService.add empty answer", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("toasts once then rejects when the server answers without a body", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    const error: unknown = await WishlistService.add(7).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HttpError);
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });
});

describe("WishlistService.remove", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a DELETE to the item url and resolves with no value on 204", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    const result = await WishlistService.remove(7);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ME_WISHLIST_ITEM(7));
    expect(url).toMatch(/\/api\/v1\/me\/wishlist\/7$/);
    expect(init.method).toBe("DELETE");
    expect(result).toBeUndefined();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("toasts once then rejects on a 404", async () => {
    mockFetch.mockImplementation(async () => json({ message: "Missing" }, 404));

    const error: unknown = await WishlistService.remove(7).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(404);
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });
});

describe("WishlistService.getAll", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("gets the wishlist url and returns every item as a model", async () => {
    const other = { beerId: 9, beerName: "Orval", addedAt: "2026-10-11T08:00:00.000Z" };
    mockFetch.mockImplementation(async () => json([itemDto, other]));

    const items = await WishlistService.getAll();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ME_WISHLIST());
    expect(init.method).toBe("GET");
    expect(items).toEqual([itemDto, other]);
  });

  it("maps each item to the model fields only and drops what the model does not carry", async () => {
    mockFetch.mockImplementation(async () => json([{ ...itemDto, internalNote: "server only" }]));

    const items = await WishlistService.getAll();

    expect(items).toStrictEqual([itemDto]);
  });

  it("returns an empty list when the server answers without a body", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(WishlistService.getAll()).resolves.toEqual([]);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects with the HttpError on a 500 without any toast", async () => {
    mockFetch.mockImplementation(async () => json({ message: "Down" }, 500));

    const error: unknown = await WishlistService.getAll().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(500);
    expect(toast.danger).not.toHaveBeenCalled();
  });
});
