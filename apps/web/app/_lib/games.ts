import type {
  ColorChoice,
  CreateGameRequest,
  Difficulty,
  GameStateDto,
  ResignResponse,
  SubmitMoveResponse,
} from "@ax-chess/shared";

import { apiRequest } from "./api";

export const activeGameQueryKey = ["activeGame"] as const;
export const gameQueryKey = (id: string) => ["game", id] as const;

export const getActiveGame = async () => {
  const response = await apiRequest("get", "games/active");
  return response.json<GameStateDto | null>();
};

export const getGame = async (id: string) => {
  const response = await apiRequest("get", `games/${id}`);
  return response.json<GameStateDto>();
};

export const createGame = async (color: ColorChoice, difficulty: Difficulty) => {
  const req: CreateGameRequest = { color, difficulty };
  const response = await apiRequest("post", "games", { json: req });
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
