import { Test } from "@nestjs/testing";

import { ChessService } from "../chess/chess.service";
import { EngineService, EngineUnavailableError } from "../engine/engine.service";
import { PrismaService } from "../prisma.service";
import { EngineUnavailableException, GameForbiddenException, GameNotFinishedException } from "./games.errors";
import { GamesService } from "./games.service";
import { ReviewService } from "./review.service";

function buildGame(overrides: Partial<{ status: "active" | "finished"; userId: string; moves: string[] }> = {}) {
  return {
    id: "g1",
    userId: overrides.userId ?? "u1",
    color: "white" as const,
    difficulty: "normal" as const,
    status: overrides.status ?? "finished",
    result: "win" as const,
    endedReason: "checkmate" as const,
    endedAt: new Date("2026-01-01"),
    createdAt: new Date("2026-01-01"),
    moveCount: overrides.moves?.length ?? 0,
    illegalCount: 0,
    moves: (overrides.moves ?? []).map((san, index) => ({ san, ply: index + 1 })),
  };
}

async function buildService(
  game: ReturnType<typeof buildGame>,
  prismaOverrides: Partial<{ findMany: jest.Mock; deleteMany: jest.Mock; createMany: jest.Mock }> = {},
  engineOverrides: Partial<EngineService> = {},
) {
  const prisma = {
    game: { findUnique: jest.fn().mockResolvedValue(game) },
    gameAnalysis: {
      findMany: prismaOverrides.findMany ?? jest.fn().mockResolvedValue([]),
      deleteMany: prismaOverrides.deleteMany ?? jest.fn().mockResolvedValue({ count: 0 }),
      createMany: prismaOverrides.createMany ?? jest.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
  };

  const chess = new ChessService();

  const module = await Test.createTestingModule({
    providers: [
      GamesService,
      ReviewService,
      { provide: PrismaService, useValue: prisma },
      { provide: ChessService, useValue: chess },
      { provide: EngineService, useValue: engineOverrides },
    ],
  }).compile();

  return { service: module.get<ReviewService>(ReviewService), prisma };
}

describe("ReviewService", () => {
  it("소유자가 다르면 GameForbiddenException", async () => {
    const { service } = await buildService(buildGame({ userId: "other" }));

    await expect(service.getReview("u1", "g1")).rejects.toThrow(GameForbiddenException);
  });

  it("진행 중 게임이면 GameNotFinishedException", async () => {
    const { service } = await buildService(buildGame({ status: "active" }));

    await expect(service.getReview("u1", "g1")).rejects.toThrow(GameNotFinishedException);
  });

  it("캐시가 전체 ply를 덮으면 엔진을 다시 부르지 않는다", async () => {
    const game = buildGame({ moves: ["e4", "e5"] });
    const findMany = jest.fn().mockResolvedValue([
      { ply: 1, evalCp: 30, classification: "good", analyzedAt: new Date("2026-01-02") },
      { ply: 2, evalCp: 20, classification: "good", analyzedAt: new Date("2026-01-02") },
    ]);
    const evaluate = jest.fn();
    const { service } = await buildService(game, { findMany }, { evaluate });

    const result = await service.getReview("u1", "g1");

    expect(evaluate).not.toHaveBeenCalled();
    expect(result.plies).toHaveLength(2);
    expect(result.plies[0]?.fen).toBe("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1");
    expect(result.analyzedAt).toBe(new Date("2026-01-02").toISOString());
  });

  it("캐시가 없으면 엔진 평가 후 분류해 저장한다", async () => {
    const game = buildGame({ moves: ["e4", "e5", "Qh5"] });
    const evaluate = jest.fn().mockResolvedValue([
      { ply: 1, evalCp: 30 },
      { ply: 2, evalCp: 20 },
      { ply: 3, evalCp: -250 },
    ]);
    const createMany = jest.fn().mockResolvedValue({ count: 3 });
    const { service } = await buildService(game, { createMany }, { evaluate });

    const result = await service.getReview("u1", "g1");

    expect(evaluate).toHaveBeenCalledWith(["e4", "e5", "Qh5"], 200);
    expect(result.plies.map((p) => p.classification)).toEqual(["good", "good", "blunder"]);
    expect(createMany).toHaveBeenCalled();
  });

  it("엔진 실패면 503 ENGINE_UNAVAILABLE", async () => {
    const game = buildGame({ moves: ["e4"] });
    const evaluate = jest.fn().mockRejectedValue(new EngineUnavailableError());
    const { service } = await buildService(game, {}, { evaluate });

    await expect(service.getReview("u1", "g1")).rejects.toThrow(EngineUnavailableException);
  });
});
