const { renderMock, createRootMock } = vi.hoisted(() => {
  const render = vi.fn();
  return { renderMock: render, createRootMock: vi.fn(() => ({ render })) };
});

vi.mock("react-dom/client", () => ({ createRoot: createRootMock }));
vi.mock("@/index.css", () => ({}));

describe("main", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("mounts the app into the root element", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    await import("@/main");

    expect(createRootMock).toHaveBeenCalledWith(root);
    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing without a root element", async () => {
    await import("@/main");

    expect(createRootMock).not.toHaveBeenCalled();
  });
});
