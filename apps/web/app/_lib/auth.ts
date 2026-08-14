import type { UserDto } from "@ax-chess/shared";

import { apiRequest } from "./api";

export const currentUserQueryKey = ["currentUser"] as const;

export const logout = () => apiRequest("post", "auth/logout");

export const getCurrentUser = async () => {
  const response = await apiRequest("get", "auth/me", { throwHttpErrors: false });

  if (response.status === 401) return null;
  if (!response.ok) throw new Error("사용자 정보를 불러오지 못했습니다.");

  return response.json<UserDto>();
};
