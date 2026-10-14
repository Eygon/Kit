import { toast } from "@heroui/react";
import BadgeService from "@/api/badges/badgeService";
import { HttpError } from "@/api/httpError";
import { ME_BADGES } from "@/utils/apiURL/apiURL";

vi.mock("@heroui/react", () => ({
  toast: { danger: vi.fn() },
}));

const mockFetch = vi.fn();

const badgeDtos = [
  {
    id: "firstSip",
    kind: "firstSip",
    family: null,
    unlocked: true,
    unlockedAt: "2026-03-01T18:30:00.000Z",
    current: 1,
    target: 1,
    comingSoon: false,
  },
  {
    id: "specialist-lager",
    kind: "specialist",
    family: "lager",
    unlocked: false,
    unlockedAt: null,
    current: 2,
    target: 9,
    comingSoon: false,
  },
  {
    id: "mystery",
    kind: "mystery",
    family: null,
    unlocked: false,
    unlockedAt: null,
    current: 0,
    target: 1,
    comingSoon: false,
  },
  {
    id: "specialist-mead",
    kind: "specialist",
    family: "mead",
    unlocked: false,
    unlockedAt: null,
    current: 0,
    target: 3,
    comingSoon: false,
  },
];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("BadgeService.getAll", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the exact badges url with a GET", async () => {
    mockFetch.mockImplementation(async () => json(badgeDtos));
    await BadgeService.getAll();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ME_BADGES());
    expect(url).toMatch(/\/api\/v1\/me\/badges$/);
    expect(init.method).toBe("GET");
  });

  it("returns the badges as models, dropping unknown kinds and nulling unknown families", async () => {
    mockFetch.mockImplementation(async () => json(badgeDtos));
    const badges = await BadgeService.getAll();

    expect(badges).toEqual([
      {
        id: "firstSip",
        kind: "firstSip",
        family: null,
        unlocked: true,
        unlockedAt: "2026-03-01T18:30:00.000Z",
        current: 1,
        target: 1,
        comingSoon: false,
      },
      {
        id: "specialist-lager",
        kind: "specialist",
        family: "lager",
        unlocked: false,
        unlockedAt: null,
        current: 2,
        target: 9,
        comingSoon: false,
      },
      {
        id: "specialist-mead",
        kind: "specialist",
        family: null,
        unlocked: false,
        unlockedAt: null,
        current: 0,
        target: 3,
        comingSoon: false,
      },
    ]);
  });

  it("returns an empty list on an empty 204 answer", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(BadgeService.getAll()).resolves.toEqual([]);
  });

  it.each([401, 500])("rejects with the HttpError on status %s and shows no toast", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));
    const failure = BadgeService.getAll();

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on a network failure and shows no toast", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(BadgeService.getAll()).rejects.toThrow("Failed to fetch");
    expect(toast.danger).not.toHaveBeenCalled();
  });
});
