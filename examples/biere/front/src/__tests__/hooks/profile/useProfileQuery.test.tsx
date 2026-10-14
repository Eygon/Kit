import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import ProfileService from "@/api/profiles/profileService";
import { queryTimes } from "@/config/tanstackQuery";
import { useProfileQuery } from "@/hooks/profile/useProfileQuery";
import { profileKeys } from "@/utils/queryKeys/profileQueryKeys";

vi.mock("@/api/profiles/profileService", () => ({
  default: { getProfile: vi.fn() },
}));

const PROFILE = {
  id: 1,
  displayName: "Alice",
  avatar: "hop",
  level: 2,
  title: "taster",
  discoveredCount: 12,
  currentThreshold: 5,
  nextThreshold: 15,
  nextTitle: "hopHead",
  followerCount: 0,
  followingCount: 2,
  isFollowed: false,
  isMe: true,
};

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useProfileQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts pending with no profile, then exposes the profile of the user", async () => {
    (ProfileService.getProfile as Mock).mockResolvedValue(PROFILE);

    const { result } = renderHook(() => useProfileQuery(1), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.profile).toBeNull();
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.profile).toEqual(PROFILE);
    expect(result.current.isError).toBe(false);
    expect(ProfileService.getProfile).toHaveBeenCalledTimes(1);
    expect(ProfileService.getProfile).toHaveBeenCalledWith(1);
  });

  it("does not read anything while there is no user id", async () => {
    const { result } = renderHook(() => useProfileQuery(null), { wrapper: wrapperFor(createTestQueryClient()) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(ProfileService.getProfile).not.toHaveBeenCalled();
    expect(result.current.profile).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it("exposes a null profile when the user is unknown", async () => {
    (ProfileService.getProfile as Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useProfileQuery(99), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.profile).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it("reports the error and no profile when the service rejects", async () => {
    (ProfileService.getProfile as Mock).mockRejectedValue(new Error("down"));

    const { result } = renderHook(() => useProfileQuery(1), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.profile).toBeNull();
  });

  it("reads the profile again on refetch and recovers from an error", async () => {
    (ProfileService.getProfile as Mock).mockRejectedValueOnce(new Error("down")).mockResolvedValue(PROFILE);

    const { result } = renderHook(() => useProfileQuery(1), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));
    expect(result.current.isError).toBe(false);
    expect(ProfileService.getProfile).toHaveBeenCalledTimes(2);
  });

  it("reads the profile of the new user when the id changes", async () => {
    (ProfileService.getProfile as Mock).mockImplementation(async (userId: number) => ({
      ...PROFILE,
      id: userId,
      displayName: userId === 2 ? "Bob" : "Alice",
    }));

    const { result, rerender } = renderHook(({ userId }) => useProfileQuery(userId), {
      initialProps: { userId: 1 },
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.profile?.displayName).toBe("Alice"));

    rerender({ userId: 2 });

    await waitFor(() => expect(result.current.profile?.displayName).toBe("Bob"));
    expect(ProfileService.getProfile).toHaveBeenLastCalledWith(2);
  });

  it("caches under profileKeys.detail(userId) with the short query times", async () => {
    (ProfileService.getProfile as Mock).mockResolvedValue(PROFILE);
    const client = createTestQueryClient();

    const { result } = renderHook(() => useProfileQuery(1), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.profile).toEqual(PROFILE));

    expect(profileKeys.detail(1).slice(0, 1)).toEqual(profileKeys.all());
    expect(profileKeys.detail(1)).not.toEqual(profileKeys.detail(2));
    const cachedQuery = client.getQueryCache().find({ queryKey: profileKeys.detail(1) });
    const options = cachedQuery?.options as QueryObserverOptions | undefined;
    expect(options).toBeDefined();
    expect(options?.staleTime).toBe(queryTimes.short.staleTime);
    expect(options?.gcTime).toBe(queryTimes.short.gcTime);
  });
});
