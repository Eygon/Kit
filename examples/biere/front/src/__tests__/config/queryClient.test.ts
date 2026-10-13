import { queryClient } from "@/config/queryClient";

describe("queryClient", () => {
  it("retries a failed query once and ignores window focus", () => {
    expect(queryClient.getDefaultOptions().queries).toMatchObject({ retry: 1, refetchOnWindowFocus: false });
  });
});
