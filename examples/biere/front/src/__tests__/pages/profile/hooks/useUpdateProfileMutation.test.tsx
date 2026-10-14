import { toast } from "@heroui/react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { createTestQueryClient } from "@/__tests__/utils/renderWithProviders";
import { useUpdateProfileMutation } from "@/pages/profile/hooks/useUpdateProfileMutation";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";
import type { Profile } from "@/types/models/profile/profile";
import { updateMyProfile } from "@/utils/queryFunctions/profileQueryFunctions";
import { feedKeys } from "@/utils/queryKeys/feedQueryKeys";
import { profileKeys } from "@/utils/queryKeys/profileQueryKeys";

vi.mock("@/utils/queryFunctions/profileQueryFunctions", () => ({
  updateMyProfile: vi.fn(),
}));

const BEFORE: Profile = {
  id: 1,
  displayName: "Alice",
  avatar: AvatarEnum.HOP,
  level: 2,
  title: LevelTitleEnum.TASTER,
  discoveredCount: 12,
  currentThreshold: 5,
  nextThreshold: 15,
  nextTitle: LevelTitleEnum.HOP_HEAD,
  followerCount: 0,
  followingCount: 2,
  isFollowed: false,
  isMe: true,
};

const AFTER: Profile = { ...BEFORE, displayName: "Alice B", avatar: AvatarEnum.FOAM };

const CHANGES = { displayName: "Alice B", avatar: AvatarEnum.FOAM };

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const renderMutation = (client: QueryClient) =>
  renderHook(() => useUpdateProfileMutation(), { wrapper: wrapperFor(client) });

describe("useUpdateProfileMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(toast, "success").mockImplementation(() => "toast-id");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the changes, writes the saved profile in the cache, toasts once and invalidates the profiles and the feed", async () => {
    (updateMyProfile as Mock).mockResolvedValue(AFTER);
    const client = createTestQueryClient();
    client.setQueryData(profileKeys.detail(1), BEFORE);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderMutation(client);

    let saved: unknown;
    await act(async () => {
      saved = await result.current.saveProfile(CHANGES);
    });

    expect(updateMyProfile).toHaveBeenCalledTimes(1);
    expect(updateMyProfile).toHaveBeenCalledWith(CHANGES);
    expect(saved).toEqual(AFTER);
    expect(client.getQueryData(profileKeys.detail(1))).toEqual(AFTER);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Profil enregistré");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: profileKeys.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: feedKeys.all() });
  });

  it("keeps the cached profile and shows no success when the save fails", async () => {
    (updateMyProfile as Mock).mockRejectedValue(new Error("Down"));
    const client = createTestQueryClient();
    client.setQueryData(profileKeys.detail(1), BEFORE);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderMutation(client);

    await act(async () => {
      await expect(result.current.saveProfile(CHANGES)).rejects.toThrow("Down");
    });

    expect(client.getQueryData(profileKeys.detail(1))).toEqual(BEFORE);
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("sends a single request when the save is pressed twice in the same tick", async () => {
    let finish: (profile: Profile) => void = () => undefined;
    (updateMyProfile as Mock).mockImplementation(
      () =>
        new Promise<Profile>((resolve) => {
          finish = resolve;
        }),
    );
    const client = createTestQueryClient();
    const { result } = renderMutation(client);

    let first: Promise<Profile | null> = Promise.resolve(null);
    let second: Promise<Profile | null> = Promise.resolve(AFTER);
    act(() => {
      first = result.current.saveProfile(CHANGES);
      second = result.current.saveProfile(CHANGES);
    });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    await act(async () => {
      finish(AFTER);
      await first;
    });

    expect(updateMyProfile).toHaveBeenCalledTimes(1);
    await expect(second).resolves.toBeNull();
    expect(toast.success).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it("accepts a new save once the failed one is over", async () => {
    (updateMyProfile as Mock).mockRejectedValueOnce(new Error("Down")).mockResolvedValueOnce(AFTER);
    const client = createTestQueryClient();
    const { result } = renderMutation(client);

    await act(async () => {
      await expect(result.current.saveProfile(CHANGES)).rejects.toThrow("Down");
    });
    await act(async () => {
      await expect(result.current.saveProfile(CHANGES)).resolves.toEqual(AFTER);
    });

    expect(updateMyProfile).toHaveBeenCalledTimes(2);
  });
});
