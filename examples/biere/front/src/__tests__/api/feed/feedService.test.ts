import { toast } from "@heroui/react";
import { HttpError } from "@/api/httpError";
import FeedService from "@/api/feed/feedService";
import { API_V1, ME_FEED } from "@/utils/apiURL/apiURL";

vi.mock("@heroui/react", () => ({
  toast: { danger: vi.fn() },
}));

const mockFetch = vi.fn();

const itemDto = (id: string, kind = "checkin") => ({
  id,
  kind,
  occurredAt: "2026-10-12T12:00:00.000Z",
  actor: { id: 3, displayName: "Carol", avatar: "glass", level: 4, title: "finePalate" },
  beerId: 7,
  beerName: "Duvel",
  place: "Le Bar",
  rating: 4,
  photoId: null,
  isDiscovery: true,
  discoveryCount: null,
  reachedLevel: null,
  reachedTitle: null,
  reviewText: null,
});

const pageDto = { items: [itemDto("checkin-2"), itemDto("poke-1", "poke")], total: 22, page: 2, size: 20 };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("FeedService.getPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the feed url under /me", () => {
    expect(ME_FEED()).toBe(`${API_V1()}/me/feed`);
  });

  it("requests the page with a GET and exactly the page parameter", async () => {
    mockFetch.mockImplementation(async () => json(pageDto));

    await FeedService.getPage(2);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ME_FEED()}?page=2`);
    expect(init.method).toBe("GET");
  });

  it("returns the page as models, ignoring the cards of an unknown kind", async () => {
    mockFetch.mockImplementation(async () => json(pageDto));

    const page = await FeedService.getPage(2);

    expect(page.items.map((item) => item.id)).toEqual(["checkin-2"]);
    expect(page.items[0]?.actor.avatar).toBe("glass");
    expect(page.total).toBe(22);
    expect(page.page).toBe(2);
    expect(page.size).toBe(20);
  });

  it.each([400, 401, 500])("rejects with the HttpError on status %s and shows no toast", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = FeedService.getPage(1);

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on a network failure and shows no toast", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(FeedService.getPage(1)).rejects.toThrow("Failed to fetch");
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on an empty 204 answer instead of returning a page", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    const failure = FeedService.getPage(1);

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status: 204 });
  });
});
