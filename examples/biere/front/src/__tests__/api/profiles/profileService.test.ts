import { toast } from "@heroui/react";
import { HttpError } from "@/api/httpError";
import ProfileService from "@/api/profiles/profileService";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { API_V1, ME_PROFILE, USERS, USER_FOLLOW, USER_FOLLOWERS, USER_FOLLOWING, USER_PROFILE } from "@/utils/apiURL/apiURL";

vi.mock("@heroui/react", () => ({
  toast: { danger: vi.fn() },
}));

const mockFetch = vi.fn();

const profileDto = {
  id: 2,
  displayName: "Bob",
  avatar: "glass",
  level: 2,
  title: "taster",
  discoveredCount: 12,
  currentThreshold: 5,
  nextThreshold: 15,
  nextTitle: "hopHead",
  followerCount: 3,
  followingCount: 1,
  isFollowed: true,
  isMe: false,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("ProfileService.getProfile", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the users routes under the api root", () => {
    expect(USERS()).toBe(`${API_V1()}/users`);
    expect(USER_PROFILE(7)).toBe(`${API_V1()}/users/7/profile`);
  });

  it("requests the profile of the user with a GET", async () => {
    mockFetch.mockImplementation(async () => json(profileDto));

    await ProfileService.getProfile(2);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(USER_PROFILE(2));
    expect(init.method).toBe("GET");
  });

  it("returns the profile as a model", async () => {
    mockFetch.mockImplementation(async () => json(profileDto));

    const profile = await ProfileService.getProfile(2);

    expect(profile).toEqual({
      id: 2,
      displayName: "Bob",
      avatar: "glass",
      level: 2,
      title: "taster",
      discoveredCount: 12,
      currentThreshold: 5,
      nextThreshold: 15,
      nextTitle: "hopHead",
      followerCount: 3,
      followingCount: 1,
      isFollowed: true,
      isMe: false,
    });
  });

  it("keeps a null next threshold and next title at the top level", async () => {
    mockFetch.mockImplementation(async () =>
      json({ ...profileDto, level: 6, title: "foamLegend", discoveredCount: 100, currentThreshold: 100, nextThreshold: null, nextTitle: null }),
    );

    const profile = await ProfileService.getProfile(2);

    expect(profile?.nextThreshold).toBeNull();
    expect(profile?.nextTitle).toBeNull();
  });

  it("returns null on a 404 without any toast", async () => {
    mockFetch.mockImplementation(async () => json({ message: "Unknown" }, 404));

    await expect(ProfileService.getProfile(99)).resolves.toBeNull();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([400, 401, 500])("rejects with the HttpError on status %s and shows no toast", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = ProfileService.getProfile(2);

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on a network failure and shows no toast", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(ProfileService.getProfile(2)).rejects.toThrow("Failed to fetch");
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on an empty 204 answer instead of returning a profile", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    const failure = ProfileService.getProfile(2);

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status: 204 });
  });
});

describe("ProfileService.updateMine", () => {
  const saved = { ...profileDto, id: 1, displayName: "Alice B", avatar: "foam", isMe: true, isFollowed: false };

  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the own profile route under the api root", () => {
    expect(ME_PROFILE()).toBe(`${API_V1()}/me/profile`);
  });

  it("sends the trimmed name and the avatar with a PUT", async () => {
    mockFetch.mockImplementation(async () => json(saved));

    await ProfileService.updateMine({ displayName: "  Alice B  ", avatar: AvatarEnum.FOAM });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ME_PROFILE());
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({ displayName: "Alice B", avatar: "foam" });
  });

  it("returns the saved profile as a model", async () => {
    mockFetch.mockImplementation(async () => json(saved));

    const profile = await ProfileService.updateMine({ displayName: "Alice B", avatar: AvatarEnum.FOAM });

    expect(profile).toEqual({ ...saved, avatar: "foam", title: "taster", nextTitle: "hopHead" });
  });

  it.each([400, 401, 500])("toasts once and rethrows the HttpError on status %s", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = ProfileService.updateMine({ displayName: "Alice B", avatar: AvatarEnum.FOAM });

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status });
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });

  it("toasts once and rethrows on a network failure", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(ProfileService.updateMine({ displayName: "Alice B", avatar: AvatarEnum.FOAM })).rejects.toThrow(
      "Failed to fetch",
    );
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });

  it("rejects and toasts once on an empty 204 answer", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(ProfileService.updateMine({ displayName: "Alice B", avatar: AvatarEnum.FOAM })).rejects.toThrow();
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });
});

describe("ProfileService.getAll", () => {
  const summaryDto = (id: number, displayName: string, isMe = false) => ({
    id,
    displayName,
    avatar: "glass",
    level: 2,
    title: "taster",
    discoveredCount: 12,
    isFollowed: false,
    isMe,
  });

  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the users list with a GET", async () => {
    mockFetch.mockImplementation(async () => json([]));

    await ProfileService.getAll();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(USERS());
    expect(init.method).toBe("GET");
  });

  it("returns the summaries as models in the server order", async () => {
    mockFetch.mockImplementation(async () =>
      json([summaryDto(1, "Alice", true), { ...summaryDto(3, "Carol"), avatar: "dragon" }, summaryDto(2, "Bob")]),
    );

    const profiles = await ProfileService.getAll();

    expect(profiles.map((profile) => profile.displayName)).toEqual(["Alice", "Carol", "Bob"]);
    expect(profiles[0]).toEqual({
      id: 1,
      displayName: "Alice",
      avatar: "glass",
      level: 2,
      title: "taster",
      discoveredCount: 12,
      isFollowed: false,
      isMe: true,
    });
    expect(profiles[1].avatar).toBe("hop");
  });

  it("returns an empty list on an empty array", async () => {
    mockFetch.mockImplementation(async () => json([]));

    await expect(ProfileService.getAll()).resolves.toEqual([]);
  });

  it("returns an empty list on a 204 answer without any toast", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(ProfileService.getAll()).resolves.toEqual([]);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([401, 500])("rejects with the HttpError on status %s and shows no toast", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = ProfileService.getAll();

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on a network failure and shows no toast", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(ProfileService.getAll()).rejects.toThrow("Failed to fetch");
    expect(toast.danger).not.toHaveBeenCalled();
  });
});

describe("ProfileService.follow and unfollow", () => {
  const followed = { ...profileDto, isFollowed: true, followerCount: 4 };

  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the follow route under the api root", () => {
    expect(USER_FOLLOW(7)).toBe(`${API_V1()}/users/7/follow`);
  });

  it("sends a POST without body and returns the followed profile as a model", async () => {
    mockFetch.mockImplementation(async () => json(followed, 201));

    const profile = await ProfileService.follow(2);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(USER_FOLLOW(2));
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
    expect(profile).toEqual({ ...followed, avatar: "glass", title: "taster", nextTitle: "hopHead" });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([400, 401, 404, 409, 500])("follow toasts once and rethrows the HttpError on status %s", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = ProfileService.follow(2);

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status });
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });

  it("follow toasts once and rethrows on a network failure", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(ProfileService.follow(2)).rejects.toThrow("Failed to fetch");
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });

  it("follow rejects and toasts once on an empty 204 answer", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(ProfileService.follow(2)).rejects.toBeInstanceOf(HttpError);
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });

  it("sends a DELETE on the follow route and resolves with nothing on a 204", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(ProfileService.unfollow(2)).resolves.toBeUndefined();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(USER_FOLLOW(2));
    expect(init.method).toBe("DELETE");
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([400, 401, 404, 500])("unfollow toasts once and rethrows the HttpError on status %s", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    const failure = ProfileService.unfollow(2);

    await expect(failure).rejects.toBeInstanceOf(HttpError);
    await expect(failure).rejects.toMatchObject({ status });
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });

  it("unfollow toasts once and rethrows on a network failure", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(ProfileService.unfollow(2)).rejects.toThrow("Failed to fetch");
    expect(toast.danger).toHaveBeenCalledTimes(1);
  });
});

describe.each([
  { method: "getFollowers", build: USER_FOLLOWERS, path: "followers" },
  { method: "getFollowing", build: USER_FOLLOWING, path: "following" },
] as const)("ProfileService.$method", ({ method, build, path }) => {
  const summaryDto = (id: number, displayName: string, isMe = false) => ({
    id,
    displayName,
    avatar: "glass",
    level: 2,
    title: "taster",
    discoveredCount: 12,
    isFollowed: false,
    isMe,
  });

  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(toast.danger).mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds the route under the api root", () => {
    expect(build(7)).toBe(`${API_V1()}/users/7/${path}`);
  });

  it("requests the list of the user with a GET", async () => {
    mockFetch.mockImplementation(async () => json([]));

    await ProfileService[method](3);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(build(3));
    expect(init.method).toBe("GET");
  });

  it("returns the summaries as models in the server order", async () => {
    mockFetch.mockImplementation(async () =>
      json([summaryDto(2, "Bob"), { ...summaryDto(1, "Alice", true), avatar: "dragon" }]),
    );

    const profiles = await ProfileService[method](3);

    expect(profiles.map((profile) => profile.displayName)).toEqual(["Bob", "Alice"]);
    expect(profiles[0]).toEqual({
      id: 2,
      displayName: "Bob",
      avatar: "glass",
      level: 2,
      title: "taster",
      discoveredCount: 12,
      isFollowed: false,
      isMe: false,
    });
    expect(profiles[1].isMe).toBe(true);
    expect(profiles[1].avatar).toBe("hop");
  });

  it("returns an empty list on an empty array", async () => {
    mockFetch.mockImplementation(async () => json([]));

    await expect(ProfileService[method](3)).resolves.toEqual([]);
  });

  it("returns an empty list on a 204 answer without any toast", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(ProfileService[method](3)).resolves.toEqual([]);
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it.each([401, 404, 500])("rejects with the HttpError on status %s and shows no toast", async (status) => {
    mockFetch.mockImplementation(async () => json({ message: "boom" }, status));

    await expect(ProfileService[method](3)).rejects.toMatchObject({ status });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("rejects on a network failure and shows no toast", async () => {
    mockFetch.mockRejectedValue(new TypeError("offline"));

    await expect(ProfileService[method](3)).rejects.toBeInstanceOf(TypeError);
    expect(toast.danger).not.toHaveBeenCalled();
  });
});
