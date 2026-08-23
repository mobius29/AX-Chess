import type { ApiError, ApiErrorCode } from "@ax-chess/shared";
import ky, { isHTTPError, type Options } from "ky";

export const apiClient = ky.create({ prefix: "/api", retry: 0 });

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

export const apiRequest = async (method: HttpMethod, path: string, options?: Omit<Options, "method">) => {
  try {
    return await apiClient(path, { ...options, method });
  } catch (error) {
    if (isHTTPError(error) && isApiError(error.data)) {
      const illegalCount = "illegalCount" in error.data ? (error.data.illegalCount as number) : undefined;
      throw new ApiRequestError(error.data.code, error.data.message, illegalCount);
    }

    throw new ApiRequestError("UNKNOWN", "요청을 처리하지 못했습니다.");
  }
};
