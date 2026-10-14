import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import ProfileService from "@/api/profiles/profileService";
import { queryTimes } from "@/config/tanstackQuery";
import { useFollowListQuery } from "@/hooks/profile/useFollowListQuery";
import { FollowListKindEnum } from "@/types/enums/user/followListKindEnum";
import { profileKeys } from "@/utils/queryKeys/profileQueryKeys";

vi.mock("@/api/profiles/profileService", () => ({
  default: { getFollowers: vi.fn(), getFollowing: vi.fn() },
}));

const BOB = {
  id: 2,
  displayName: "Bob",
  avatar: "glass",
  level: 2,
  title: "taster",
  discoveredCount: 12,
  isFollowed: false,
  isMe: false,
};

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useFollowListQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads nothing while the sheet is closed", async () => {
    const { result } = renderHook(() => useFollowListQuery(3, FollowListKindEnum.FOLLOWERS, false), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(ProfileService.getFollowers).not.toHaveBeenCalled();
    expect(ProfileService.getFollowing).not.toHaveBeenCalled();
    expect(result.current.profiles).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it("starts pending, then exposes the followers of the user once open", async () => {
    (ProfileService.getFollowers as Mock).mockResolvedValue([BOB]);

    const { result } = renderHook(() => useFollowListQuery(3, FollowListKindEnum.FOLLOWERS, true), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.profiles).toEqual([BOB]);
    expect(ProfileService.getFollowers).toHaveBeenCalledTimes(1);
    expect(ProfileService.getFollowers).toHaveBeenCalledWith(3);
    expect(ProfileService.getFollowing).not.toHaveBeenCalled();
  });

  it("reads the followed users for the following kind", async () => {
    (ProfileService.getFollowing as Mock).mockResolvedValue([BOB]);

    const { result } = renderHook(() => useFollowListQuery(3, FollowListKindEnum.FOLLOWING, true), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.profiles).toEqual([BOB]));
    expect(ProfileService.getFollowing).toHaveBeenCalledWith(3);
    expect(ProfileService.getFollowers).not.toHaveBeenCalled();
  });

  it("starts reading when the sheet opens", async () => {
    (ProfileService.getFollowers as Mock).mockResolvedValue([BOB]);

    const { result, rerender } = renderHook(
      ({ isEnabled }) => useFollowListQuery(3, FollowListKindEnum.FOLLOWERS, isEnabled),
      { initialProps: { isEnabled: false }, wrapper: wrapperFor(createTestQueryClient()) },
    );
    expect(ProfileService.getFollowers).not.toHaveBeenCalled();

    rerender({ isEnabled: true });

    await waitFor(() => expect(result.current.profiles).toEqual([BOB]));
    expect(ProfileService.getFollowers).toHaveBeenCalledTimes(1);
  });

  it("reports the error and no profile when the service rejects", async () => {
    (ProfileService.getFollowers as Mock).mockRejectedValue(new Error("down"));

    const { result } = renderHook(() => useFollowListQuery(3, FollowListKindEnum.FOLLOWERS, true), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.profiles).toEqual([]);
  });

  it("reads the list again on refetch and recovers from an error", async () => {
    (ProfileService.getFollowers as Mock).mockRejectedValueOnce(new Error("down")).mockResolvedValue([BOB]);

    const { result } = renderHook(() => useFollowListQuery(3, FollowListKindEnum.FOLLOWERS, true), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.profiles).toEqual([BOB]));
    expect(result.current.isError).toBe(false);
    expect(ProfileService.getFollowers).toHaveBeenCalledTimes(2);
  });

  it("gives an empty list for a user nobody follows", async () => {
    (ProfileService.getFollowers as Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useFollowListQuery(3, FollowListKindEnum.FOLLOWERS, true), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.profiles).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it("caches under profileKeys.followList(userId, kind) with the short query times", async () => {
    (ProfileService.getFollowers as Mock).mockResolvedValue([BOB]);
    const client = createTestQueryClient();

    const { result } = renderHook(() => useFollowListQuery(3, FollowListKindEnum.FOLLOWERS, true), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.profiles).toEqual([BOB]));

    expect(profileKeys.followList(3, FollowListKindEnum.FOLLOWERS).slice(0, 1)).toEqual(profileKeys.all());
    expect(profileKeys.followList(3, FollowListKindEnum.FOLLOWERS)).not.toEqual(
      profileKeys.followList(3, FollowListKindEnum.FOLLOWING),
    );
    expect(profileKeys.followList(3, FollowListKindEnum.FOLLOWERS)).not.toEqual(
      profileKeys.followList(4, FollowListKindEnum.FOLLOWERS),
    );
    const cachedQuery = client.getQueryCache().find({ queryKey: profileKeys.followList(3, FollowListKindEnum.FOLLOWERS) });
    const options = cachedQuery?.options as QueryObserverOptions | undefined;
    expect(options).toBeDefined();
    expect(options?.staleTime).toBe(queryTimes.short.staleTime);
    expect(options?.gcTime).toBe(queryTimes.short.gcTime);
  });
});
