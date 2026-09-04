import ky from "ky";

export const apiClient = ky.create({ prefix: "/api", retry: 0 });
