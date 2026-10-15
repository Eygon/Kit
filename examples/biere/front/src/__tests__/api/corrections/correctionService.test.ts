import { toast } from "@heroui/react";
import { HttpError } from "@/api/httpError";
import CorrectionService from "@/api/corrections/correctionService";
import { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import i18n from "@/i18n/i18n";
import { CorrectionVoteSenseEnum } from "@/types/enums/correction/correctionVoteSenseEnum";
import { BEER_BY_ID, BEER_CORRECTIONS, CORRECTION_VOTE, CORRECTIONS } from "@/utils/apiURL/apiURL";
import { fetchCorrectionBoard, proposeCorrection, voteCorrection } from "@/utils/queryFunctions/correctionQueryFunctions";

vi.mock("@heroui/react", () => ({
  toast: { danger: vi.fn() },
}));

const mockFetch = vi.fn();

const correctionDto = (id: number, characteristic = "ibu") => ({
  id,
  beerId: 7,
  beerName: "Chimay Rouge",
  characteristic,
  currentValue: null,
  proposedValue: 35,
  reason: "Fiche du brasseur",
  proposedBy: 2,
  proposedByName: "Bob",
  createdAt: "2026-10-10T10:00:00.000Z",
  closesAt: "2026-10-17T10:00:00.000Z",
  status: "open",
  resolvedAt: null,
  agreeCount: 2,
  disagreeCount: 1,
  myVote: null,
  isMine: false,
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("CorrectionService.getForBeer", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the beer corrections url from the beer url", () => {
    expect(BEER_CORRECTIONS(7)).toMatch(/\/api\/v1\/beers\/7\/corrections$/);
    expect(BEER_CORRECTIONS(7)).toBe(`${BEER_BY_ID(7)}/corrections`);
  });

  it("requests the corrections of the beer with a plain GET", async () => {
    mockFetch.mockImplementation(async () => json([]));

    await CorrectionService.getForBeer(7);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(BEER_CORRECTIONS(7));
    expect(init.method).toBe("GET");
  });

  it("returns the corrections as models in the order of the response", async () => {
    mockFetch.mockImplementation(async () => json([correctionDto(9), correctionDto(4, "abv")]));

    const corrections = await CorrectionService.getForBeer(7);

    expect(corrections.map((correction) => [correction.id, correction.characteristic])).toEqual([
      [9, BeerCharacteristicEnum.IBU],
      [4, BeerCharacteristicEnum.ABV],
    ]);
    expect(corrections[0]).toMatchObject({ status: "open", resolvedAt: null });
  });

  it("drops the corrections of an unknown characteristic and keeps the others", async () => {
    mockFetch.mockImplementation(async () => json([correctionDto(1, "colour"), correctionDto(2)]));

    const corrections = await CorrectionService.getForBeer(7);

    expect(corrections.map((correction) => correction.id)).toEqual([2]);
  });

  it("returns an empty list for an empty response", async () => {
    mockFetch.mockImplementation(async () => json([]));

    await expect(CorrectionService.getForBeer(7)).resolves.toEqual([]);
  });

  it("returns an empty list for a 204", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(CorrectionService.getForBeer(7)).resolves.toEqual([]);
  });

  it("lets the error reach the caller without a toast", async () => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, 500));

    await expect(CorrectionService.getForBeer(7)).rejects.toBeInstanceOf(HttpError);
    expect(toast.danger).not.toHaveBeenCalled();
  });
});

describe("CorrectionService.vote", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the vote url from the corrections root", () => {
    expect(CORRECTION_VOTE(5)).toMatch(/\/api\/v1\/corrections\/5\/vote$/);
  });

  it.each([
    [CorrectionVoteSenseEnum.AGREE, "agree"],
    [CorrectionVoteSenseEnum.DISAGREE, "disagree"],
  ])("puts the sense %s as the only body field to the vote url", async (sense, expected) => {
    mockFetch.mockImplementation(async () => json(correctionDto(5)));

    await CorrectionService.vote(5, sense);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(CORRECTION_VOTE(5));
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ sense: expected });
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("returns the updated correction as a model with the counters and the vote of the user, no toast", async () => {
    mockFetch.mockImplementation(async () => json({ ...correctionDto(5), agreeCount: 3, disagreeCount: 1, myVote: "agree" }));

    const correction = await CorrectionService.vote(5, CorrectionVoteSenseEnum.AGREE);

    expect(correction).toMatchObject({ id: 5, agreeCount: 3, disagreeCount: 1, myVote: CorrectionVoteSenseEnum.AGREE });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("on a 409 shows one toast saying the vote is closed and rethrows the HttpError", async () => {
    mockFetch.mockImplementation(async () => json({ message: "closed" }, 409));

    const failure = await CorrectionService.vote(5, CorrectionVoteSenseEnum.AGREE).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(409);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Ce vote est clos.");
  });

  it("on a 403 shows one toast saying the user cannot vote on their own suggestion and rethrows", async () => {
    mockFetch.mockImplementation(async () => json({ message: "own" }, 403));

    const failure = await CorrectionService.vote(5, CorrectionVoteSenseEnum.DISAGREE).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(403);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith("Vous ne votez pas sur votre proposition.");
  });

  it.each([
    [400, "errors.badRequest"],
    [401, "errors.unauthorized"],
    [404, "errors.notFound"],
    [500, "errors.generic"],
  ])("on status %s shows one toast with the text of %s and rethrows", async (status, key) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = await CorrectionService.vote(5, CorrectionVoteSenseEnum.AGREE).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith(i18n.t(key));
  });

  it("rejects an empty answer with a single toast", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(CorrectionService.vote(5, CorrectionVoteSenseEnum.AGREE)).rejects.toThrow("Empty vote response");
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });

  it("rejects an answer of an unknown characteristic with a single toast", async () => {
    mockFetch.mockImplementation(async () => json(correctionDto(5, "colour")));

    await expect(CorrectionService.vote(5, CorrectionVoteSenseEnum.AGREE)).rejects.toThrow("Unknown correction characteristic");
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });
});

describe("voteCorrection", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("puts the vote of the pressed sense through the service", async () => {
    mockFetch.mockImplementation(async () => json({ ...correctionDto(5), myVote: "disagree" }));

    const correction = await voteCorrection(5, CorrectionVoteSenseEnum.DISAGREE);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect((mockFetch.mock.calls[0] as [string, RequestInit])[0]).toBe(CORRECTION_VOTE(5));
    expect(correction.myVote).toBe(CorrectionVoteSenseEnum.DISAGREE);
  });
});

describe("CorrectionService.propose", () => {
  const newCorrection = { characteristic: BeerCharacteristicEnum.IBU, value: 35, reason: "Fiche du brasseur" };

  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the characteristic, the value and the reason, and only them, to the corrections url of the beer", async () => {
    mockFetch.mockImplementation(async () => json(correctionDto(11), 201));

    await CorrectionService.propose(7, newCorrection);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(BEER_CORRECTIONS(7));
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ characteristic: "ibu", value: 35, reason: "Fiche du brasseur" });
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("posts a list value as a list", async () => {
    mockFetch.mockImplementation(async () => json(correctionDto(11, "aromas"), 201));

    await CorrectionService.propose(7, { characteristic: BeerCharacteristicEnum.AROMAS, value: ["fruity", "hoppy"], reason: "" });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ characteristic: "aromas", value: ["fruity", "hoppy"], reason: "" });
  });

  it("returns the created correction as a model, with no toast", async () => {
    mockFetch.mockImplementation(async () => json({ ...correctionDto(11), proposedBy: 1, isMine: true, agreeCount: 1, disagreeCount: 0 }, 201));

    const correction = await CorrectionService.propose(7, newCorrection);

    expect(correction).toMatchObject({ id: 11, beerId: 7, characteristic: BeerCharacteristicEnum.IBU, proposedValue: 35, isMine: true, agreeCount: 1, disagreeCount: 0, myVote: null });
    expect(correction).toMatchObject({ status: "open", resolvedAt: null });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([
    [409, "Une proposition est déjà en cours pour cette caractéristique."],
    [429, "Limite atteinte : 10 propositions par jour."],
    [403, "Vous avez ajouté cette bière : d'autres la corrigent."],
  ])("on a %s shows one dedicated toast and rethrows the HttpError", async (status, message) => {
    mockFetch.mockImplementation(async () => json({ message: "refused" }, status));

    const failure = await CorrectionService.propose(7, newCorrection).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect((failure as HttpError).status).toBe(status);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith(message);
  });

  it.each([
    [400, "errors.badRequest"],
    [401, "errors.unauthorized"],
    [404, "errors.notFound"],
    [500, "errors.generic"],
  ])("on status %s shows one toast with the text of %s and rethrows", async (status, key) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = await CorrectionService.propose(7, newCorrection).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect(toast.danger).toHaveBeenCalledTimes(1);
    expect(toast.danger).toHaveBeenCalledWith(i18n.t(key));
  });

  it("rejects an empty answer with a single toast", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(CorrectionService.propose(7, newCorrection)).rejects.toThrow("Empty propose response");
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });

  it("rejects an answer of an unknown characteristic with a single toast", async () => {
    mockFetch.mockImplementation(async () => json(correctionDto(11, "colour"), 201));

    await expect(CorrectionService.propose(7, newCorrection)).rejects.toThrow("Unknown correction characteristic");
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });
});

describe("proposeCorrection", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the correction of the beer through the service", async () => {
    mockFetch.mockImplementation(async () => json(correctionDto(11), 201));

    const correction = await proposeCorrection(7, { characteristic: BeerCharacteristicEnum.IBU, value: 35, reason: "" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect((mockFetch.mock.calls[0] as [string, RequestInit])[0]).toBe(BEER_CORRECTIONS(7));
    expect(correction.id).toBe(11);
  });
});

describe("CorrectionService.getBoard", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the corrections root and derives the vote url from it", () => {
    expect(CORRECTIONS()).toMatch(/\/api\/v1\/corrections$/);
    expect(CORRECTION_VOTE(5)).toBe(`${CORRECTIONS()}/5/vote`);
  });

  it("requests the board with a plain GET on the corrections root", async () => {
    mockFetch.mockImplementation(async () => json({ open: [], recentlyClosed: [], pendingCount: 0 }));

    await CorrectionService.getBoard();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(CORRECTIONS());
    expect(init.method).toBe("GET");
  });

  it("maps both lists in the served order and keeps the pending count", async () => {
    mockFetch.mockImplementation(async () =>
      json({
        open: [correctionDto(9), correctionDto(4, "abv")],
        recentlyClosed: [{ ...correctionDto(3), status: "accepted", resolvedAt: "2026-10-12T08:00:00.000Z" }],
        pendingCount: 2,
      }),
    );

    const board = await CorrectionService.getBoard();

    expect(board.open.map(({ id, characteristic }) => [id, characteristic])).toEqual([
      [9, BeerCharacteristicEnum.IBU],
      [4, BeerCharacteristicEnum.ABV],
    ]);
    expect(board.recentlyClosed.map(({ id, status, resolvedAt }) => [id, status, resolvedAt])).toEqual([
      [3, "accepted", "2026-10-12T08:00:00.000Z"],
    ]);
    expect(board.pendingCount).toBe(2);
  });

  it("returns an empty board on an empty body", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    expect(await CorrectionService.getBoard()).toEqual({ open: [], recentlyClosed: [], pendingCount: 0 });
  });

  it("rethrows a failed read without any toast so the query reports it", async () => {
    mockFetch.mockImplementation(async () => json({ message: "down" }, 500));

    await expect(CorrectionService.getBoard()).rejects.toBeInstanceOf(HttpError);
    expect(toast.danger).not.toHaveBeenCalled();
  });
});

describe("fetchCorrectionBoard", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the board through the service", async () => {
    mockFetch.mockImplementation(async () => json({ open: [correctionDto(1)], recentlyClosed: [], pendingCount: 1 }));

    const board = await fetchCorrectionBoard();

    expect(board.open.map(({ id }) => id)).toEqual([1]);
    expect(board.pendingCount).toBe(1);
  });
});
