import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { toast } from "@heroui/react";
import { useFollowToggle } from "@/hooks/profile/useFollowToggle";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";
import type { Profile } from "@/types/models/profile/profile";
import type { ProfileSummary } from "@/types/models/profile/profileSummary";
import { followUser, unfollowUser } from "@/utils/queryFunctions/profileQueryFunctions";
import { feedKeys } from "@/utils/queryKeys/feedQueryKeys";
import { profileKeys } from "@/utils/queryKeys/profileQueryKeys";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));

vi.mock("@/utils/queryFunctions/profileQueryFunctions", () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}));

const buildSummary = (id: number, displayName: string, isFollowed = false): ProfileSummary => ({
  id,
  displayName,
  avatar: AvatarEnum.GLASS,
  level: 2,
  title: LevelTitleEnum.TASTER,
  discoveredCount: 12,
  isFollowed,
  isMe: false,
});

const LIST = [buildSummary(2, "Bob"), buildSummary(3, "Carol")];
const FOLLOWED_PROFILE = { id: 2, displayName: "Bob", isFollowed: true } as Profile;

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const cachedList = (client: QueryClient) => client.getQueryData<ProfileSummary[]>(profileKeys.list());

const renderToggle = (client: QueryClient, userId = 2, displayName = "Bob") =>
  renderHook(() => useFollowToggle(userId, displayName), { wrapper: wrapperFor(client) });

describe("useFollowToggle", () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = createTestQueryClient();
    client.setQueryData(profileKeys.list(), LIST);
  });

  it("follows, flips the row before the server answers, toasts the success and refreshes profiles and feed", async () => {
    const pending = deferred<Profile>();
    (followUser as Mock).mockReturnValue(pending.promise);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderToggle(client);

    act(() => result.current.toggleFollow(true));

    await waitFor(() => expect(cachedList(client)).toEqual([buildSummary(2, "Bob", true), buildSummary(3, "Carol")]));
    expect(result.current.isPending).toBe(true);
    expect(followUser).toHaveBeenCalledTimes(1);
    expect(followUser).toHaveBeenCalledWith(2);
    expect(unfollowUser).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();

    await act(async () => pending.resolve(FOLLOWED_PROFILE));

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Vous suivez Bob");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: profileKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: feedKeys.all() });
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("unfollows, flips the row back and toasts that the user is no longer followed", async () => {
    client.setQueryData(profileKeys.list(), [buildSummary(2, "Bob", true), buildSummary(3, "Carol", true)]);
    const pending = deferred<void>();
    (unfollowUser as Mock).mockReturnValue(pending.promise);
    const { result } = renderToggle(client);

    act(() => result.current.toggleFollow(false));

    await waitFor(() => expect(cachedList(client)).toEqual([buildSummary(2, "Bob", false), buildSummary(3, "Carol", true)]));
    expect(unfollowUser).toHaveBeenCalledTimes(1);
    expect(unfollowUser).toHaveBeenCalledWith(2);
    expect(followUser).not.toHaveBeenCalled();

    await act(async () => pending.resolve());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Vous ne suivez plus Bob"));
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(result.current.isPending).toBe(false);
  });

  it("rolls the row back on failure, refreshes anyway and shows no success toast nor toast.danger from the hook", async () => {
    const pending = deferred<Profile>();
    (followUser as Mock).mockReturnValue(pending.promise);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderToggle(client);

    act(() => result.current.toggleFollow(true));
    await waitFor(() => expect(cachedList(client)?.[0].isFollowed).toBe(true));

    await act(async () => pending.reject(new Error("server down")));

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(cachedList(client)).toEqual(LIST);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: profileKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: feedKeys.all() });
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.danger).not.toHaveBeenCalled();
  });

  it("fires one call when toggled twice in the same tick, then accepts a new toggle once settled", async () => {
    const pending = deferred<Profile>();
    (followUser as Mock).mockReturnValue(pending.promise);
    (unfollowUser as Mock).mockResolvedValue(undefined);
    const { result } = renderToggle(client);

    act(() => {
      result.current.toggleFollow(true);
      result.current.toggleFollow(true);
    });
    await act(async () => pending.resolve(FOLLOWED_PROFILE));
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(followUser).toHaveBeenCalledTimes(1);

    act(() => result.current.toggleFollow(false));
    await waitFor(() => expect(unfollowUser).toHaveBeenCalledTimes(1));
  });

  it("releases the guard after a failure so the user can try again", async () => {
    (followUser as Mock).mockRejectedValueOnce(new Error("nope")).mockResolvedValueOnce(FOLLOWED_PROFILE);
    const { result } = renderToggle(client);

    act(() => result.current.toggleFollow(true));
    await waitFor(() => expect(result.current.isPending).toBe(false));
    act(() => result.current.toggleFollow(true));

    await waitFor(() => expect(followUser).toHaveBeenCalledTimes(2));
  });

  it("does not invent a list when none is cached and leaves the other rows untouched", async () => {
    const empty = createTestQueryClient();
    (followUser as Mock).mockRejectedValue(new Error("nope"));
    const { result } = renderToggle(empty);

    act(() => result.current.toggleFollow(true));

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(cachedList(empty)).toBeUndefined();
  });
});
