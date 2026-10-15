import { toast } from "@heroui/react";
import { HttpError } from "@/api/httpError";
import ReviewService from "@/api/reviews/reviewService";
import i18n from "@/i18n/i18n";
import type { NewReview } from "@/types/models/review/newReview";
import {
  BEER_BY_ID,
  BEER_MY_REVIEW,
  BEER_REVIEWS,
} from "@/utils/apiURL/apiURL";

vi.mock("@heroui/react", () => ({
  toast: { danger: vi.fn() },
}));

const mockFetch = vi.fn();

const reviewDto = (id: number, isMine = false) => ({
  id,
  beerId: 7,
  authorId: id,
  authorName: `Author ${id}`,
  authorAvatar: "hop",
  rating: 4,
  text: "Bien",
  createdAt: "2026-10-10T10:00:00.000Z",
  updatedAt: "2026-10-12T12:00:00.000Z",
  isMine,
});

const pageDto = {
  mine: reviewDto(1, true),
  items: [reviewDto(4), reviewDto(3)],
  total: 12,
  page: 2,
  size: 10,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe("ReviewService.getPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the beer reviews url from the beer url", async () => {
    expect(BEER_REVIEWS(7)).toMatch(/\/api\/v1\/beers\/7\/reviews$/);
    expect(BEER_REVIEWS(7)).toBe(`${BEER_BY_ID(7)}/reviews`);
  });

  it("requests the page of the beer with a GET and exactly the page parameter", async () => {
    mockFetch.mockImplementation(async () => json(pageDto));

    await ReviewService.getPage(7, 2);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BEER_REVIEWS(7)}?page=2`);
    expect(init.method).toBe("GET");
  });

  it("returns the page as models with mine, the other reviews and the paging", async () => {
    mockFetch.mockImplementation(async () => json(pageDto));

    const page = await ReviewService.getPage(7, 2);

    expect(page).toEqual(pageDto);
    expect(page.mine?.isMine).toBe(true);
  });

  it("returns a null mine when the user has not reviewed the beer", async () => {
    mockFetch.mockImplementation(async () => json({ ...pageDto, mine: null }));

    expect((await ReviewService.getPage(7, 1)).mine).toBeNull();
  });

  it.each([400, 401, 404, 500])(
    "rejects with the HttpError on status %s and shows no toast",
    async (status) => {
      mockFetch.mockImplementation(async () =>
        json({ message: "boom" }, status),
      );

      const failure = ReviewService.getPage(7, 1);

      await expect(failure).rejects.toBeInstanceOf(HttpError);
      await expect(failure).rejects.toMatchObject({ status });
      expect(toast.danger).not.toHaveBeenCalled();
    },
  );

  it("rejects on a network failure and shows no toast", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(ReviewService.getPage(7, 1)).rejects.toThrow(
      "Failed to fetch",
    );
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on an empty 204 answer instead of returning a page", async () => {
    mockFetch.mockImplementation(
      async () => new Response(null, { status: 204 }),
    );

    const failure = ReviewService.getPage(7, 1);

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status: 204 });
  });
});

const NEW_REVIEW: NewReview = {
  rating: 4.5,
  text: "Très bonne",
};

describe("ReviewService.save", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the my review url from the beer reviews url", () => {
    expect(BEER_MY_REVIEW(7)).toMatch(/\/api\/v1\/beers\/7\/reviews\/me$/);
    expect(BEER_MY_REVIEW(7)).toBe(`${BEER_REVIEWS(7)}/me`);
  });

  it("puts the review as the upsert body on the my review url", async () => {
    mockFetch.mockImplementation(async () => json(reviewDto(1, true)));

    await ReviewService.save(7, NEW_REVIEW);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(BEER_MY_REVIEW(7));
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({
      rating: 4.5,
      text: "Très bonne",
    });
  });

  it("returns the saved review as a model without any toast", async () => {
    mockFetch.mockImplementation(async () => json(reviewDto(1, true)));

    const saved = await ReviewService.save(7, NEW_REVIEW);

    expect(saved).toEqual(reviewDto(1, true));
    expect(saved.isMine).toBe(true);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("shows the check-in-first message once and rethrows on a 403", async () => {
    mockFetch.mockImplementation(async () =>
      json(
        { message: "You must check in this beer before reviewing it." },
        403,
      ),
    );

    const failure = ReviewService.save(7, NEW_REVIEW);

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status: 403 });
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith(
      "Enregistrez d'abord une dégustation de cette bière.",
    );
  });

  it.each([
    [400, "errors.badRequest"],
    [401, "errors.unauthorized"],
    [404, "errors.notFound"],
    [500, "errors.generic"],
  ])(
    "shows the message of the status %s once and rethrows",
    async (status, key) => {
      mockFetch.mockImplementation(async () =>
        json({ message: "boom" }, status),
      );

      await expect(ReviewService.save(7, NEW_REVIEW)).rejects.toMatchObject({
        status,
      });

      expect(i18n.t(key)).not.toBe("");
      expect(i18n.t(key)).not.toBe(
        i18n.t("pages.beerDetail.reviews.checkinRequired"),
      );
      expect(toast.danger).toHaveBeenCalledTimes(1);
      expect(toast.danger).toHaveBeenCalledWith(i18n.t(key));
    },
  );

  it("shows the generic message and rethrows on a network failure", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(ReviewService.save(7, NEW_REVIEW)).rejects.toThrow(
      "Failed to fetch",
    );

    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith(i18n.t("errors.generic"));
  });

  it("rejects with the generic message on an empty 204 answer", async () => {
    mockFetch.mockImplementation(
      async () => new Response(null, { status: 204 }),
    );

    await expect(ReviewService.save(7, NEW_REVIEW)).rejects.toThrow(
      "Empty save response",
    );

    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith(i18n.t("errors.generic"));
  });
});

describe("ReviewService.remove", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends one DELETE on the my review url of the beer and resolves without any toast", async () => {
    mockFetch.mockImplementation(
      async () => new Response(null, { status: 204 }),
    );

    await expect(ReviewService.remove(7)).resolves.toBeUndefined();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(BEER_MY_REVIEW(7));
    expect(init.method).toBe("DELETE");
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([
    [400, "errors.badRequest"],
    [401, "errors.unauthorized"],
    [404, "errors.notFound"],
    [500, "errors.generic"],
  ])(
    "shows the message of the status %s once and rethrows",
    async (status, key) => {
      mockFetch.mockImplementation(async () =>
        json({ message: "boom" }, status),
      );

      const failure = ReviewService.remove(7);

      await expect(failure).rejects.toBeInstanceOf(HttpError);
      await expect(failure).rejects.toMatchObject({ status });
      expect(i18n.t(key)).not.toBe("");
      expect(toast.danger).toHaveBeenCalledTimes(1);
      expect(toast.danger).toHaveBeenCalledWith(i18n.t(key));
    },
  );

  it("shows the generic message and rethrows on a network failure", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(ReviewService.remove(7)).rejects.toThrow("Failed to fetch");

    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith(i18n.t("errors.generic"));
  });
});
