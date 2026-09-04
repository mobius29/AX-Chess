import { apiClient } from "./client";

let refreshInFlight: Promise<boolean> | undefined;

export const refreshSession = () => {
  if (!refreshInFlight) {
    refreshInFlight = apiClient
      .post("auth/refresh", { throwHttpErrors: false })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = undefined;
      });
  }
  return refreshInFlight;
};
