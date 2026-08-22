import { Test } from "@nestjs/testing";

import { Prisma } from "../../generated/prisma/client";
import { ChessService } from "../chess/chess.service";
import { EngineService, EngineUnavailableError } from "../engine/engine.service";
import { PrismaService } from "../prisma.service";
import {
  ActiveGameExistsException,
  EngineUnavailableException,
  GameAlreadyFinishedException,
  GameForbiddenException,
  IllegalMoveException,
  NotAiTurnException,
  NotYourTurnException,
} from "./games.errors";
import { GamesService } from "./games.service";

/**
 * In-memory 게임 row 하나를 흉내 낸다. 실제 Postgres 대신 game.update/move.create가
 * 같은 객체를 누적 변경하도록 해서, GamesService가 스스로 재조회한 값을 기준으로 판단하는지 검증한다.
 */
function createFakeGame(overrides: Partial<{ color: "white" | "black"; moves: string[] }> = {}) {
  const state = {
    id: "g1",
    userId: "u1",
    color: overrides.color ?? "white",
    difficulty: "normal",
    status: "active" as "active" | "finished",
    result: null as string | null,
    endedReason: null as string | null,
    moveCount: overrides.moves?.length ?? 0,
    illegalCount: 0,
    createdAt: new Date("2026-01-01"),
    endedAt: null as Date | null,
    moves: (overrides.moves ?? []).map((san, index) => ({ san, ply: index + 1 })),
  };

  const prisma = withTransaction({
    game: {
      create: jest.fn().mockResolvedValue(state),
      findUnique: jest.fn().mockResolvedValue(state),
      findFirst: jest.fn().mockResolvedValue(state),
      update: jest.fn((args: { data?: Record<string, unknown> }) => {
        const mutableState = state as Record<string, unknown>;
        for (const [key, value] of Object.entries(args.data ?? {})) {
          // 실제 Prisma의 { increment } 연산자를 흉내 낸다.
          mutableState[key] =
            value && typeof value === "object" && "increment" in value
              ? (mutableState[key] as number) + (value as { increment: number }).increment
              : value;
        }
        return Promise.resolve({ ...state });
      }),
    },
    move: {
      create: jest.fn((args: { data: { san: string; ply: number } }) => {
        state.moves.push({ san: args.data.san, ply: args.data.ply });
        return Promise.resolve(args.data);
      }),
    },
  });

  return { state, prisma };
}

function withTransaction<T extends object>(client: T): T & { $transaction: jest.Mock } {
  return Object.assign(client, { $transaction: jest.fn((callback: (tx: T) => unknown) => callback(client)) });
}

describe("GamesService", () => {
  const chess = new ChessService();

  async function buildService(prisma: unknown, engine: Partial<EngineService> = {}) {
    const module = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ChessService, useValue: chess },
        { provide: EngineService, useValue: engine },
      ],
    }).compile();

    return module.get<GamesService>(GamesService);
  }

  it("getGame은 소유자가 다르면 GameForbiddenException", async () => {
    const { prisma } = createFakeGame();
    const service = await buildService(prisma);

    await expect(service.getGame("other-user", "g1")).rejects.toThrow(GameForbiddenException);
  });

  it("createGame은 진행 중 게임이 있으면 ActiveGameExistsException (P2002)", async () => {
    const { prisma } = createFakeGame();
    prisma.game.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("unique constraint", { code: "P2002", clientVersion: "test" }),
    );
    const service = await buildService(prisma);

    await expect(service.createGame("u1", "white", "normal")).rejects.toThrow(ActiveGameExistsException);
  });

  it("submitMove는 상대 턴이면 NotYourTurnException, 수가 저장되지 않는다", async () => {
    const { prisma } = createFakeGame({ color: "black" }); // 백 차례인데 흑(사용자)이 두려는 상황
    const service = await buildService(prisma);

    await expect(service.submitMove("u1", "g1", "e4")).rejects.toThrow(NotYourTurnException);
    expect(prisma.move.create).not.toHaveBeenCalled();
  });

  it("submitMove는 불법 수를 illegalCount 증가 후 동일한 응답으로 거부한다", async () => {
    const { prisma, state } = createFakeGame({ color: "white" });
    const service = await buildService(prisma);

    await expect(service.submitMove("u1", "g1", "Zz9")).rejects.toThrow(IllegalMoveException);
    expect(state.illegalCount).toBe(1);
    expect(prisma.move.create).not.toHaveBeenCalled();
  });

  it("submitMove는 합법 수를 저장하고 AI 응수까지 한 응답에 담는다", async () => {
    const { prisma } = createFakeGame({ color: "white" });
    const engine = { bestMove: jest.fn().mockResolvedValue("e7e5") };
    const service = await buildService(prisma, engine);

    const result = await service.submitMove("u1", "g1", "e4");

    expect(result.accepted).toBe("e4");
    expect(result.aiMove).toBe("e5");
    expect(result.moves).toEqual(["e4", "e5"]);
    expect(result.turn).toBe("white");
    expect(result.status).toBe("active");
  });

  it("사용자 수가 체크메이트면 AI 응수 없이 즉시 종료, 사용자 승리로 기록된다", async () => {
    // 폴스메이트: 사용자가 흑을 잡고 Qh4#로 마무리
    const { prisma } = createFakeGame({ color: "black", moves: ["f3", "e5", "g4"] });
    const engine = { bestMove: jest.fn() };
    const service = await buildService(prisma, engine);

    const result = await service.submitMove("u1", "g1", "Qh4#");

    expect(result.aiMove).toBeNull();
    expect(result.status).toBe("finished");
    expect(result.result).toBe("win");
    expect(result.endedReason).toBe("checkmate");
    expect(engine.bestMove).not.toHaveBeenCalled();
  });

  it("엔진 실패 시 503, 이미 저장된 사용자 수는 롤백하지 않는다", async () => {
    const { prisma, state } = createFakeGame({ color: "white" });
    const engine = { bestMove: jest.fn().mockRejectedValue(new EngineUnavailableError()) };
    const service = await buildService(prisma, engine);

    await expect(service.submitMove("u1", "g1", "e4")).rejects.toThrow(EngineUnavailableException);
    expect(state.moves.map((m) => m.san)).toEqual(["e4"]);
  });

  it("createGame(흑)에서 엔진이 실패하면 게임 row 자체를 만들지 않는다 (고아 방지)", async () => {
    const { prisma } = createFakeGame();
    const engine = { bestMove: jest.fn().mockRejectedValue(new EngineUnavailableError()) };
    const service = await buildService(prisma, engine);

    await expect(service.createGame("u1", "black", "normal")).rejects.toThrow(EngineUnavailableException);
    expect(prisma.game.create).not.toHaveBeenCalled();
  });

  it("retryAiMove는 AI가 이미 응수했으면 엔진을 다시 안 부르고 그 결과를 그대로 재반환한다 (멱등)", async () => {
    const { prisma } = createFakeGame({ color: "white", moves: ["e4", "e5"] });
    const engine = { bestMove: jest.fn() };
    const service = await buildService(prisma, engine);

    const result = await service.retryAiMove("u1", "g1");

    expect(engine.bestMove).not.toHaveBeenCalled();
    expect(result.accepted).toBe("e4");
    expect(result.aiMove).toBe("e5");
  });

  it("retryAiMove는 사람이 아직 한 수도 안 뒀으면 NotAiTurnException", async () => {
    const { prisma } = createFakeGame({ color: "white" });
    const engine = { bestMove: jest.fn() };
    const service = await buildService(prisma, engine);

    await expect(service.retryAiMove("u1", "g1")).rejects.toThrow(NotAiTurnException);
    expect(engine.bestMove).not.toHaveBeenCalled();
  });

  it("resign은 이미 종료된 게임이면 GameAlreadyFinishedException", async () => {
    const { prisma } = createFakeGame();
    const service = await buildService(prisma);
    await service.resign("u1", "g1");

    await expect(service.resign("u1", "g1")).rejects.toThrow(GameAlreadyFinishedException);
  });
});
