import { HttpError } from "@/api/httpError";
import { HttpStatusCodeEnum } from "@/types/enums/http/httpStatusCodeEnum";
import { getCurrentUserId } from "@/utils/currentUser/getCurrentUserId";

export interface HttpResponse<T> {
  status: number;
  data: T | null;
}

export interface HttpRequestOptions {
  signal?: AbortSignal;
}

type RequestInitWithBody = Omit<RequestInit, "body"> & { body?: unknown };

const buildBody = (body: unknown): BodyInit | undefined => {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
};

const request = async <T>(url: string, init: RequestInitWithBody = {}): Promise<HttpResponse<T>> => {
  const isJsonBody = init.body !== undefined && !(init.body instanceof FormData);
  const response = await fetch(url, {
    ...init,
    body: buildBody(init.body),
    headers: {
      Accept: "application/json",
      "X-User-Id": getCurrentUserId().toString(),
      ...(isJsonBody ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new HttpError(response.status, response.statusText);
  }
  if (response.status === HttpStatusCodeEnum.NO_CONTENT) {
    return { status: response.status, data: null };
  }
  return { status: response.status, data: (await response.json()) as T };
};

export const httpClient = {
  get: <T>(url: string, options: HttpRequestOptions = {}) => request<T>(url, { method: "GET", ...options }),
  post: <T>(url: string, body: unknown, options: HttpRequestOptions = {}) =>
    request<T>(url, { method: "POST", body, ...options }),
  postForm: <T>(url: string, formData: FormData, options: HttpRequestOptions = {}) =>
    request<T>(url, { method: "POST", body: formData, ...options }),
  patch: <T>(url: string, body: unknown, options: HttpRequestOptions = {}) =>
    request<T>(url, { method: "PATCH", body, ...options }),
  put: <T>(url: string, body: unknown, options: HttpRequestOptions = {}) =>
    request<T>(url, { method: "PUT", body, ...options }),
  delete: (url: string, options: HttpRequestOptions = {}) => request<null>(url, { method: "DELETE", ...options }),
};
