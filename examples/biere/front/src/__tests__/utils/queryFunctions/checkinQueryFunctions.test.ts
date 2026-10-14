import type { Mock } from "vitest";
import CheckinService from "@/api/checkins/checkinService";
import { fetchCheckinPage, updateCheckin } from "@/utils/queryFunctions/checkinQueryFunctions";

vi.mock("@/api/checkins/checkinService", () => ({
  default: { getPage: vi.fn(), update: vi.fn() },
}));

describe("fetchCheckinPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to CheckinService.getPage with the beer id and the page and returns its page", async () => {
    const page = { items: [], total: 0, page: 3, size: 20 };
    (CheckinService.getPage as Mock).mockResolvedValue(page);

    const result = await fetchCheckinPage(7, 3);

    expect(CheckinService.getPage).toHaveBeenCalledTimes(1);
    expect(CheckinService.getPage).toHaveBeenCalledWith(7, 3);
    expect(result).toBe(page);
  });

  it("passes a null beer id through", async () => {
    (CheckinService.getPage as Mock).mockResolvedValue({ items: [], total: 0, page: 1, size: 20 });

    await fetchCheckinPage(null, 1);

    expect(CheckinService.getPage).toHaveBeenCalledWith(null, 1);
  });

  it("lets the service rejection through", async () => {
    (CheckinService.getPage as Mock).mockRejectedValue(new Error("down"));

    await expect(fetchCheckinPage(7, 1)).rejects.toThrow("down");
  });
});

describe("updateCheckin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to CheckinService.update with the id and the changes and returns the updated checkin", async () => {
    const updated = { id: 11 };
    (CheckinService.update as Mock).mockResolvedValue(updated);

    const result = await updateCheckin({ checkinId: 11, changes: { rating: 4 } });

    expect(CheckinService.update).toHaveBeenCalledTimes(1);
    expect(CheckinService.update).toHaveBeenCalledWith(11, { rating: 4 });
    expect(result).toBe(updated);
  });

  it("lets the service rejection through", async () => {
    (CheckinService.update as Mock).mockRejectedValue(new Error("down"));

    await expect(updateCheckin({ checkinId: 11, changes: { rating: 4 } })).rejects.toThrow("down");
  });
});
