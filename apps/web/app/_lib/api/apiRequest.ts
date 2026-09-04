import type { ApiError, ApiErrorCode } from "@ax-chess/shared";
import type { KyResponse, Options } from "ky";

import { apiClient } from "./client";
import { refreshSession } from "./refreshSession";

const SESSION_PATHS = new Set(["auth/login", "auth/logout", "auth/refresh", "auth/signup"]);

export { apiClient } from "./client";

const isApiError = (value: unknown): value is ApiError =>
  typeof value === "object" &&
  value !== null &&
  "code" in value &&
  "message" in value &&
  typeof value.message === "string";

export class ApiRequestError extends Error {
  code: ApiErrorCode | "UNKNOWN";
  illegalCount?: number;

  constructor(code: ApiErrorCode | "UNKNOWN", message: string, illegalCount?: number) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.illegalCount = illegalCount;
  }
}

type HttpMethod = NonNullable<Options["method"]>;

const redirectToLogin = () => {
  if (typeof window !== "undefined") window.location.assign("/login");
};

const toApiRequestError = async (response: Response) => {
  const body: unknown = await response
    .clone()
    .json()
    .catch(() => undefined);
  if (isApiError(body)) {
    const illegalCount = "illegalCount" in body ? (body.illegalCount as number) : undefined;
    return new ApiRequestError(body.code, body.message, illegalCount);
  }

  return new ApiRequestError("UNKNOWN", "요청을 처리하지 못했습니다.");
};

export const apiRequest = async (
  method: HttpMethod,
  path: string,
  options?: Omit<Options, "method">,
  retried = false,
): Promise<KyResponse> => {
  const response = await apiClient(path, { ...options, method, throwHttpErrors: false });

  if (response.status === 401 && !retried && !SESSION_PATHS.has(path) && (await refreshSession())) {
    return apiRequest(method, path, options, true);
  }

  if (response.status === 401 && !SESSION_PATHS.has(path)) redirectToLogin();
  if (response.ok || options?.throwHttpErrors === false) return response;

  throw await toApiRequestError(response);
};
