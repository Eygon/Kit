import { describe, expect, it, vi } from "vitest";

const bootstrap = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/bootstrap", () => ({ bootstrap }));

describe("main", () => {
  it("starts the application on import", async () => {
    await import("@/main.js");

    expect(bootstrap).toHaveBeenCalledOnce();
  });
});
