import type { QueryClient, QueryObserverOptions } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import ProfileService from "@/api/profiles/profileService";
import { queryTimes } from "@/config/tanstackQuery";
import { useProfilesQuery } from "@/pages/people/hooks/useProfilesQuery";
import { profileKeys } from "@/utils/queryKeys/profileQueryKeys";

vi.mock("@/api/profiles/profileService", () => ({
  default: { getAll: vi.fn() },
}));

const PROFILES = [
  { id: 1, displayName: "Alice", avatar: "hop", level: 2, title: "taster", discoveredCount: 12, isFollowed: false, isMe: true },
  { id: 2, displayName: "Bob", avatar: "glass", level: 1, title: "curious", discoveredCount: 3, isFollowed: true, isMe: false },
];

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useProfilesQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts pending with no profile, then exposes the list", async () => {
    (ProfileService.getAll as Mock).mockResolvedValue(PROFILES);

    const { result } = renderHook(() => useProfilesQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    expect(result.current.isPending).toBe(true);
    expect(result.current.profiles).toEqual([]);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.profiles).toEqual(PROFILES);
    expect(result.current.isError).toBe(false);
    expect(ProfileService.getAll).toHaveBeenCalledTimes(1);
  });

  it("reports the error and an empty list when the service rejects", async () => {
    (ProfileService.getAll as Mock).mockRejectedValue(new Error("down"));

    const { result } = renderHook(() => useProfilesQuery(), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.profiles).toEqual([]);
  });

  it("reads the list again on refetch and recovers from an error", async () => {
    (ProfileService.getAll as Mock).mockRejectedValueOnce(new Error("down")).mockResolvedValue(PROFILES);

    const { result } = renderHook(() => useProfilesQuery(), { wrapper: wrapperFor(createTestQueryClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.profiles).toEqual(PROFILES));
    expect(result.current.isError).toBe(false);
    expect(ProfileService.getAll).toHaveBeenCalledTimes(2);
  });

  it("caches under profileKeys.list() with the short query times", async () => {
    (ProfileService.getAll as Mock).mockResolvedValue(PROFILES);
    const client = createTestQueryClient();

    const { result } = renderHook(() => useProfilesQuery(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.profiles).toEqual(PROFILES));

    expect(profileKeys.list().slice(0, 1)).toEqual(profileKeys.all());
    expect(profileKeys.list()).not.toEqual(profileKeys.detail(1));
    const cachedQuery = client.getQueryCache().find({ queryKey: profileKeys.list() });
    const options = cachedQuery?.options as QueryObserverOptions | undefined;
    expect(options).toBeDefined();
    expect(options?.staleTime).toBe(queryTimes.short.staleTime);
    expect(options?.gcTime).toBe(queryTimes.short.gcTime);
  });
});
