import type { Mock } from "vitest";
import CheckinService from "@/api/checkins/checkinService";
import { fetchCheckinPage } from "@/utils/queryFunctions/checkinQueryFunctions";

vi.mock("@/api/checkins/checkinService", () => ({
  default: { getPage: vi.fn() },
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
