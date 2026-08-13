import type { ApiError } from "@ax-chess/shared";
import ky, { isHTTPError, type Options } from "ky";

export const apiClient = ky.create({ prefix: "/api", retry: 0 });

const isApiError = (value: unknown): value is ApiError =>
  typeof value === "object" && value !== null && "message" in value && typeof value.message === "string";

type HttpMethod = NonNullable<Options["method"]>;

export const apiRequest = async (method: HttpMethod, path: string, options?: Omit<Options, "method">) => {
  try {
    return await apiClient(path, { ...options, method });
  } catch (error) {
    if (isHTTPError(error) && isApiError(error.data)) {
      throw new Error(error.data.message);
    }

    throw new Error("요청을 처리하지 못했습니다.");
  }
};
