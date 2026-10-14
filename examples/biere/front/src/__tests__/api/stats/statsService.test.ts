import { toast } from "@heroui/react";
import { HttpError } from "@/api/httpError";
import StatsService from "@/api/stats/statsService";
import { ME_STATS } from "@/utils/apiURL/apiURL";

vi.mock("@heroui/react", () => ({
  toast: { danger: vi.fn() },
}));

const mockFetch = vi.fn();

const statsDto = {
  checkinCount: 14,
  discoveredCount: 9,
  averageAbv: 6.5,
  countries: [{ country: "BE", count: 5 }],
  favoriteFamily: "mead",
  averageRating: null,
  currentStreak: 3,
  bestStreak: 6,
  monthlyCheckins: [{ month: "2026-10", count: 2 }],
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("StatsService.get", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the exact stats url with a GET", async () => {
    mockFetch.mockImplementation(async () => json(statsDto));
    await StatsService.get();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ME_STATS());
    expect(url).toMatch(/\/api\/v1\/me\/stats$/);
    expect(init.method).toBe("GET");
  });

  it("returns the stats as a model with an unknown family nulled", async () => {
    mockFetch.mockImplementation(async () => json(statsDto));

    await expect(StatsService.get()).resolves.toEqual({
      checkinCount: 14,
      discoveredCount: 9,
      averageAbv: 6.5,
      countries: [{ country: "BE", count: 5 }],
      favoriteFamily: null,
      averageRating: null,
      currentStreak: 3,
      bestStreak: 6,
      monthlyCheckins: [{ month: "2026-10", count: 2 }],
    });
  });

  it("rejects with an HttpError carrying the status on an empty 204 answer", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));
    const failure = StatsService.get();

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status: 204 });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([401, 500])("rejects with the HttpError on status %s and shows no toast", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));
    const failure = StatsService.get();

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on a network failure and shows no toast", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(StatsService.get()).rejects.toThrow("Failed to fetch");
    expect(toast.danger).not.toHaveBeenCalled();
  });
});
