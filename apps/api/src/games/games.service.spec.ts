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
  GameNotFoundException,
  IllegalMoveException,
  NotAiTurnException,
  NotYourTurnException,
} from "./games.errors";
import { GamesService } from "./games.service";

function baseGameFields(
  overrides: Partial<{ id: string; color: "white" | "black"; moveCount: number; illegalCount: number }> = {},
) {
  return {
    id: overrides.id ?? "g1",
    userId: "u1",
    color: overrides.color ?? "white",
    difficulty: "normal",
    moveCount: overrides.moveCount ?? 0,
    illegalCount: overrides.illegalCount ?? 0,
    createdAt: new Date("2026-01-01"),
  };
}

function createFakeGame(overrides: Partial<{ color: "white" | "black"; moves: string[] }> = {}) {
  const state = {
    ...baseGameFields({ color: overrides.color, moveCount: overrides.moves?.length }),
    status: "active" as "active" | "finished",
    result: null as string | null,
    endedReason: null as string | null,
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

function buildFinishedGame(
  overrides: Partial<{
    id: string;
    color: "white" | "black";
    moveCount: number;
    illegalCount: number;
    endedAt: Date;
  }> = {},
) {
  return {
    ...baseGameFields(overrides),
    status: "finished" as const,
    result: "win",
    endedReason: "checkmate",
    endedAt: overrides.endedAt ?? new Date("2026-01-01"),
  };
}

function createListGamesPrisma(games: ReturnType<typeof buildFinishedGame>[]) {
  const first = games[0];
  return withTransaction({
    game: {
      findFirst: jest
        .fn()
        .mockResolvedValue(first ? { id: first.id, userId: first.userId } : { id: "owned", userId: "u1" }),
      findMany: jest.fn().mockResolvedValue(games),
    },
  });
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

  it("resign은 기권한 유저의 패배로 기록되고 응답에 result/endedReason/moveCount가 담긴다", async () => {
    const { prisma } = createFakeGame({ color: "white", moves: ["e4", "e5"] });
    const service = await buildService(prisma);

    const result = await service.resign("u1", "g1");

    expect(result.status).toBe("finished");
    expect(result.result).toBe("loss");
    expect(result.endedReason).toBe("resign");
    expect(result.moveCount).toBe(2);
  });

  it("resign이 체크메이트와 동시에 도착하면(먼저 커밋된 쪽이 이김) GameAlreadyFinishedException", async () => {
    const { prisma } = createFakeGame({ color: "white", moves: ["e4"] });
    prisma.game.update.mockImplementationOnce(() => {
      throw new Prisma.PrismaClientKnownRequestError("No record found", { code: "P2025", clientVersion: "test" });
    });
    const service = await buildService(prisma);

    await expect(service.resign("u1", "g1")).rejects.toThrow(GameAlreadyFinishedException);
  });

  describe("listGames 정확도 계산 (accuracy = moveCount / (moveCount + illegalCount))", () => {
    it("API 스펙 예시와 일치한다 (moveCount=34, illegal=3 → 0.919)", async () => {
      const prisma = createListGamesPrisma([buildFinishedGame({ moveCount: 34, illegalCount: 3 })]);
      const service = await buildService(prisma);

      const { items } = await service.listGames("u1");

      expect(items[0]?.accuracy).toBe(0.919);
    });

    it("0 ÷ 0 (한 수도 안 두고 기권, 실착도 없음)은 1로 처리한다", async () => {
      const prisma = createListGamesPrisma([buildFinishedGame({ moveCount: 0, illegalCount: 0 })]);
      const service = await buildService(prisma);

      const { items } = await service.listGames("u1");

      expect(items[0]?.accuracy).toBe(1);
    });

    it("한 수도 못 두고 실착만 쌓인 채 기권하면 0이다", async () => {
      const prisma = createListGamesPrisma([buildFinishedGame({ moveCount: 0, illegalCount: 2 })]);
      const service = await buildService(prisma);

      const { items } = await service.listGames("u1");

      expect(items[0]?.accuracy).toBe(0);
    });

    it("소수점 셋째 자리에서 반올림한다 (2/3 → 0.667)", async () => {
      const prisma = createListGamesPrisma([buildFinishedGame({ moveCount: 2, illegalCount: 1 })]);
      const service = await buildService(prisma);

      const { items } = await service.listGames("u1");

      expect(items[0]?.accuracy).toBe(0.667);
    });
  });

  it("listGames는 limit보다 하나 더 조회해 다음 페이지 존재 여부를 판단하고, 초과분은 잘라낸다", async () => {
    const games = [buildFinishedGame({ id: "g1" }), buildFinishedGame({ id: "g2" }), buildFinishedGame({ id: "g3" })];
    const prisma = createListGamesPrisma(games);
    const service = await buildService(prisma);

    const result = await service.listGames("u1", 2);

    expect(prisma.game.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", status: "finished" }, take: 3 }),
    );
    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.id)).toEqual(["g1", "g2"]);
    expect(result.nextCursor).toBe("g2");
  });

  it("listGames는 limit<=0으로 직접 호출돼도 최소 1로 취급한다 (DTO의 @Min(1) 우회 방어)", async () => {
    const prisma = createListGamesPrisma([buildFinishedGame({ id: "g1" }), buildFinishedGame({ id: "g2" })]);
    const service = await buildService(prisma);

    const result = await service.listGames("u1", 0);

    expect(prisma.game.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2 }));
    expect(result.items).toHaveLength(1);
  });

  it("listGames는 마지막 페이지면 nextCursor가 null이다", async () => {
    const prisma = createListGamesPrisma([buildFinishedGame({ id: "g1" })]);
    const service = await buildService(prisma);

    const result = await service.listGames("u1", 2);

    expect(result.nextCursor).toBeNull();
  });

  it("listGames는 cursor가 있으면 그 뒤부터 조회한다", async () => {
    const prisma = createListGamesPrisma([buildFinishedGame({ id: "g5" })]);
    const service = await buildService(prisma);

    await service.listGames("u1", 20, "g4");

    expect(prisma.game.findMany).toHaveBeenCalledWith(expect.objectContaining({ cursor: { id: "g4" }, skip: 1 }));
  });

  it("listGames는 cursor가 존재하지 않으면 GameNotFoundException, findMany는 호출되지 않는다", async () => {
    const prisma = createListGamesPrisma([buildFinishedGame({ id: "g5" })]);
    prisma.game.findFirst.mockResolvedValueOnce(null);
    const service = await buildService(prisma);

    await expect(service.listGames("u1", 20, "not-mine")).rejects.toThrow(GameNotFoundException);
    expect(prisma.game.findFirst).toHaveBeenCalledWith({
      where: { id: "not-mine", status: "finished" },
      select: { id: true, userId: true },
    });
    expect(prisma.game.findMany).not.toHaveBeenCalled();
  });

  it("listGames는 cursor가 남의 게임이면 GameForbiddenException(404 아님), findMany는 호출되지 않는다", async () => {
    const prisma = createListGamesPrisma([buildFinishedGame({ id: "g5" })]);
    prisma.game.findFirst.mockResolvedValueOnce({ id: "g4", userId: "other-user" });
    const service = await buildService(prisma);

    await expect(service.listGames("u1", 20, "g4")).rejects.toThrow(GameForbiddenException);
    expect(prisma.game.findMany).not.toHaveBeenCalled();
  });

  it("listGames는 손상된 행 하나 때문에 페이지 전체가 500 되지 않고, 그 행만 건너뛴다", async () => {
    const good = buildFinishedGame({ id: "g1" });
    const corrupt = { ...buildFinishedGame({ id: "g2" }), endedReason: null as unknown as string };
    const prisma = createListGamesPrisma([good, corrupt]);
    const service = await buildService(prisma);

    const result = await service.listGames("u1");

    expect(result.items.map((item) => item.id)).toEqual(["g1"]);
  });
});
