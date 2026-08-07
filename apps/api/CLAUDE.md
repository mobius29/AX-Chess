# apps/api — NestJS

Every blindfold-integrity constraint from the root `CLAUDE.md` applies here. Above all: **no `fen`, `board`, `pieces`, `legalMoves`, `evaluation`, `bestMove`, or `hint` in a response DTO.**

## Rebuilding the board

Board state is never stored. Replay the SAN list from the `moves` table to rebuild it in memory on each request.

```ts
function replay(sans: string[]): Chess {
  const chess = new Chess();
  for (const san of sans) chess.move(san);
  return chess;
}
```

A 40-move replay takes under 1ms. Do not cache it — a cache is stored board state.

The `Chess` instance never escapes the service. Do not pass it to a controller, a DTO, or a log.

## Move submission order (`POST /games/:id/moves`)

1. Verify ownership → 2. Verify `status = active` → 3. Replay → 4. Verify turn → 5. Validate the move; on failure increment `illegal_count` and return `422` → 6. Store the move → 7. Check for a terminal state (skip the AI reply if terminal) → 8. Compute and store the AI reply → 9. Check for a terminal state again

Pass the input string to `chess.js` untouched. The library already parses SAN, UCI, `O-O`/`0-0`, and `e8=Q`. Always store the **normalized SAN** (input `e2e4` stores as `e4`).

Illegal attempts never become rows in `moves`. They are counted only in `games.illegal_count`.

## Illegal-move response

Notation error, nonexistent piece, blocked path, king left in check — **all return the same response.**

```json
{ "code": "ILLEGAL_MOVE", "message": "둘 수 없는 수입니다.", "illegalCount": 3 }
```

Never branch by cause. Response timing must not vary by cause either.

## Engine

- `movetime` — 1000ms for in-game replies, 200ms per move for review analysis. Difficulty maps to `UCI_LimitStrength` plus `UCI_Elo` (800/1100/1400).
- Keep the process resident and warm. Do not spawn one per request.
- On failure return `503 ENGINE_UNAVAILABLE`. **The user's move stays committed on its own.** Never roll it back.
- Lower the engine log level in production. UCI debug output prints FEN verbatim.

## Prisma

- No FEN column in the schema.
- Accuracy and win/loss/draw stats are computed and aggregated at read time, never stored as columns.
- The partial unique index (`one_active_game_per_user`) cannot be expressed in the Prisma schema, so write it directly in the migration SQL. Application-level checks alone let concurrent requests create duplicates.
- `status = finished` is terminal. Do not add `cancelled`.
- Prisma client access stays inside the domain module that uses it. Do not build a global repository layer.

## Errors and constants

They live next to the code that throws or uses them (`IllegalMoveError` in `chess.service.ts`; `EngineUnavailableError` and `DIFFICULTY_ELO` in `engine.service.ts`). No central `errors/` or `constants/` folder.

As domain errors grow, consolidate HTTP mapping into one base class carrying an `ApiErrorCode` field plus a single exception filter. Services do not import `HttpException` from `@nestjs/common`.

## Tests

`pnpm --filter api test`. New rule logic gets a spec. The quiet regressions live in the four draw conditions, castling/en passant/promotion parsing, and finished-game immutability.
