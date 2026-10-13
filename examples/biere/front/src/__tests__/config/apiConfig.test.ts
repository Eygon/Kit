describe("apiConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("targets the local backend by default", async () => {
    vi.stubEnv("VITE_API_URL", "");

    const { API_BASE_URL } = await import("@/config/apiConfig");

    expect(API_BASE_URL).toBe("http://localhost:5090");
  });

  it("reads the base url from VITE_API_URL", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.mousse.test");

    const { API_BASE_URL } = await import("@/config/apiConfig");

    expect(API_BASE_URL).toBe("https://api.mousse.test");
  });
});
