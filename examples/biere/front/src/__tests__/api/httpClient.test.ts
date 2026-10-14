import { httpClient } from "@/api/httpClient";
import { HttpError } from "@/api/httpError";
import { StorageKeyEnum } from "@/types/enums/storage/storageKeyEnum";

const mockFetch = vi.fn();

const lastInit = () => mockFetch.mock.calls[0][1] as RequestInit & { headers: Record<string, string> };

describe("httpClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the default demo user when none is stored", async () => {
    mockFetch.mockResolvedValue(new Response("[]", { status: 200 }));

    await httpClient.get("http://x/api/v1/users");

    expect(lastInit().headers).toMatchObject({ "X-User-Id": "1", Accept: "application/json" });
  });

  it("sends the stored current user", async () => {
    window.localStorage.setItem(StorageKeyEnum.CURRENT_USER_ID, "3");
    mockFetch.mockResolvedValue(new Response("[]", { status: 200 }));

    await httpClient.get("http://x/api/v1/users");

    expect(lastInit().headers).toMatchObject({ "X-User-Id": "3" });
  });

  it("returns the parsed body with its status", async () => {
    mockFetch.mockResolvedValue(new Response('[{"id":1}]', { status: 200 }));

    await expect(httpClient.get("http://x")).resolves.toEqual({ status: 200, data: [{ id: 1 }] });
  });

  it("serializes a JSON body on post and patch", async () => {
    mockFetch.mockImplementation(async () => new Response("{}", { status: 201 }));

    await httpClient.post("http://x/api/v1/beers", { name: "Saison" });
    await httpClient.patch("http://x/api/v1/beers/1", { name: "Stout" });

    const [postInit, patchInit] = mockFetch.mock.calls.map((call) => call[1] as RequestInit & { headers: Record<string, string> });
    expect(postInit.method).toBe("POST");
    expect(postInit.body).toBe('{"name":"Saison"}');
    expect(postInit.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(patchInit.method).toBe("PATCH");
    expect(patchInit.body).toBe('{"name":"Stout"}');
  });

  it("serializes a JSON body on put with the PUT method and the JSON content type", async () => {
    mockFetch.mockImplementation(async () => new Response('{"id":1}', { status: 200 }));

    const response = await httpClient.put("http://x/api/v1/beers/1/reviews/me", { rating: 4 });

    expect(response).toEqual({ status: 200, data: { id: 1 } });
    expect(lastInit().method).toBe("PUT");
    expect(lastInit().body).toBe('{"rating":4}');
    expect(lastInit().headers).toMatchObject({ "Content-Type": "application/json", "X-User-Id": "1" });
  });

  it("returns a null data on a 204 put", async () => {
    mockFetch.mockImplementation(async () => new Response(null, { status: 204 }));

    await expect(httpClient.put("http://x/a", { rating: 4 })).resolves.toEqual({ status: 204, data: null });
  });

  it("passes the abort signal on put", async () => {
    mockFetch.mockImplementation(async () => new Response("{}", { status: 200 }));
    const controller = new AbortController();

    await httpClient.put("http://x/a", { rating: 4 }, { signal: controller.signal });

    expect(lastInit().signal).toBe(controller.signal);
  });

  it("posts a form data body without a hand-set content type", async () => {
    mockFetch.mockResolvedValue(new Response("{}", { status: 201 }));
    const formData = new FormData();
    formData.append("file", new Blob(["x"]), "photo.jpg");

    await httpClient.postForm("http://x/api/v1/photos", formData);

    expect(lastInit().body).toBe(formData);
    expect(lastInit().headers).not.toHaveProperty("Content-Type");
  });

  it("sends no body and no content type on get", async () => {
    mockFetch.mockResolvedValue(new Response("[]", { status: 200 }));

    await httpClient.get("http://x");

    expect(lastInit().body).toBeUndefined();
    expect(lastInit().headers).not.toHaveProperty("Content-Type");
  });

  it("forwards the abort signal", async () => {
    mockFetch.mockResolvedValue(new Response("[]", { status: 200 }));
    const controller = new AbortController();

    await httpClient.get("http://x", { signal: controller.signal });

    expect(lastInit().signal).toBe(controller.signal);
  });

  it("returns a null body on 204", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(httpClient.delete("http://x/api/v1/beers/1")).resolves.toEqual({ status: 204, data: null });
    expect(lastInit().method).toBe("DELETE");
  });

  it("throws an HttpError carrying the status on a failed response", async () => {
    mockFetch.mockResolvedValue(new Response("", { status: 403, statusText: "Forbidden" }));

    await expect(httpClient.get("http://x")).rejects.toMatchObject({ status: 403, message: "Forbidden" });
    await expect(httpClient.get("http://x")).rejects.toBeInstanceOf(HttpError);
  });
});
