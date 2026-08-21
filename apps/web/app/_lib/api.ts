import type { ApiError, ApiErrorCode } from "@ax-chess/shared";
import ky, { isHTTPError, type Options } from "ky";

export const apiClient = ky.create({ prefix: "/api", retry: 0 });

const isApiError = (value: unknown): value is ApiError =>
  typeof value === "object" &&
  value !== null &&
  "code" in value &&
  "message" in value &&
  typeof value.message === "string";

/** 서버 에러 응답의 code를 그대로 들고 있다. 화면별 분기(ENGINE_UNAVAILABLE → 재시도 등)는 이 code로 한다. */
export class ApiRequestError extends Error {
  code: ApiErrorCode | "UNKNOWN";
  /** ILLEGAL_MOVE 응답에만 실려 오는 값 */
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
