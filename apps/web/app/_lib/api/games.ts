import type {
  ActiveGameResponse,
  CreateGameRequest,
  GameStateDto,
  ResignResponse,
  SubmitMoveResponse,
} from "@ax-chess/shared";

import { apiRequest } from "./apiClient";

export const activeGameQueryKey = ["activeGame"] as const;
export const gameQueryKey = (id: string) => ["game", id] as const;

export const getActiveGame = async () => {
  const response = await apiRequest("get", "games/active");
  const { activeGame } = await response.json<ActiveGameResponse>();
  return activeGame;
};

export const getGame = async (id: string) => {
  const response = await apiRequest("get", `games/${id}`);
  return response.json<GameStateDto>();
};

export const createGame = async (request: CreateGameRequest) => {
  const response = await apiRequest("post", "games", { json: request });
  return response.json<GameStateDto>();
};

export const submitMove = async (id: string, move: string) => {
  const response = await apiRequest("post", `games/${id}/moves`, { json: { move } });
  return response.json<SubmitMoveResponse>();
};

export const retryAiMove = async (id: string) => {
  const response = await apiRequest("post", `games/${id}/ai-move`);
  return response.json<SubmitMoveResponse>();
};

export const resignGame = async (id: string) => {
  const response = await apiRequest("post", `games/${id}/resign`);
  return response.json<ResignResponse>();
};
