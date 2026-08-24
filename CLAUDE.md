# AX-Chess

**Blindfold chess** against an AI, with no board UI. During a game there is only the move list and an input field. The board appears solely on the post-game review screen.

Planning docs live in Notion. Read the relevant Phase doc before starting work.

- [PRD v2](https://app.notion.com/p/3238d35f445080208069cfee0d2a6aba)
- [API spec](https://app.notion.com/p/3b28d35f44508107bea5f20eee49fe25)
- [DB design and state diagrams](https://app.notion.com/p/3b28d35f4450816b960df23a45d68a90)
- [Development checklist](https://app.notion.com/p/3b28d35f4450814fb202e49a1399b451)

---

## 1. Hard constraint — blindfold integrity

> **Board state for an in-progress game (`status = active`) exists in no response, no log, and no DB column.**
> If this breaks, the product does not exist. It is never relaxed for performance or convenience.

**Forbidden fields** — `fen` `board` `pieces` `legalMoves` `evaluation` `bestMove` `hint`

| Rule                                                                      | Rationale                                                                  |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Never put those fields in an active-game response                         | PRD 8.1                                                                    |
| Never send legal move lists or engine evaluations to the client           | Evaluation is an indirect signal of board state                            |
| No FEN column in the database                                             | A value you never store cannot leak                                        |
| Rebuild the board only in server memory, by replaying the stored SAN list | One source of truth                                                        |
| Illegal-move responses are identical regardless of cause                  | Free retries plus a detailed message equals a board-scanning tool          |
| Never log FEN, legal moves, raw JWTs, or password hashes                  | Engine debug output prints FEN verbatim                                    |
| **Never build a chessboard into the game screen**                         | The "just a small minimap" temptation is the real risk. Block it in review |

**The one exception** — `GET /games/:id/review`. It answers only for finished games and includes FEN. Without the `status = finished` gate, that endpoint becomes the cheating bypass.

DTO, controller, and mapper files under `packages/shared` and `apps/api` are checked at write time by `.claude/hooks/blindfold-guard.sh`. Legitimate exceptions such as review-only fields pass by carrying a `blindfold-ok: <reason>` comment on that line. Never work around the guard without one.

---

## 2. Stack

```
Browser ─httpOnly cookie─> Next.js (Vercel)
                            └ Route Handler proxy /api/* ─Bearer JWT─> NestJS (AWS ECS Express Mode)
                                                                        ├ chess.js   rules, SAN/UCI parsing, draw detection
                                                                        ├ stockfish  WASM, kept warm in-process
                                                                        └ Prisma ─SSL─> Neon Postgres
```

- The browser talks only to the Vercel domain. NestJS is never called directly, so **no CORS configuration is needed.**
- The JWT lives only in an httpOnly cookie. The proxy strips `accessToken` from the login response body and moves it into the cookie.
- The engine runs in-process on the server only. It is never shipped to the client.

---

## 3. Commands

```bash
pnpm dev:api          # NestJS watch
pnpm dev:web          # Next.js dev
pnpm lint             # oxlint, whole workspace from the root
pnpm fmt              # oxfmt
pnpm typecheck        # whole workspace
pnpm --filter api test # jest
```

pnpm workspaces. Do not use npm or yarn.

---

## 4. Structure conventions

```
apps/api/src/          Feature folders, as-is. No src/modules, core, or infrastructure layer folders
  chess/               chess.js wrapper — replay, SAN/UCI parsing, terminal-state detection
  engine/              Stockfish wrapper — bestMove, evaluate
  games/               The only game HTTP entry point. Controllers live here and nowhere else
  auth/
apps/web/app/          Next.js App Router. app/api/[...proxy] is the BE proxy
packages/shared/src/   FE/BE API contract. **Types only**
```

- **Error classes** live inside the domain that throws them. No central `errors/` folder. Past three in one domain, split into `<domain>.errors.ts` — same folder.
- **Constants** live in the service file that uses them. No global `constants/` barrel. Tuning difficulty Elo must be a three-constant edit, nothing more.
- **No runtime values in `packages/shared`.** With types only, imports erase at compile time and the sources can be referenced directly with no build step. A single constant, enum, or function forces a tsc build on this package. Request DTOs (class-validator) are runtime values, so they belong in `apps/api/src/<domain>/dto/`.
- **Entities and Prisma access** live in the domain folder that uses them. No global `entities/`.
- Values that change per environment (DB URL, JWT secret, engine path) are not constants. Use `@nestjs/config` plus env. Never commit them.

---

## 5. Fixed API contract points

Successful responses return the resource object directly, with no wrapper. Failures return exactly two fields, `{ code, message }` — never add helpers like `details`, `hint`, or `legalMoves`. `code` must be a member of the `ApiErrorCode` union in `packages/shared`.

**One exception — `GET /games/active`.** Its body can legitimately be `null` (no active game), and Nest/Express sends a raw `null` return as a truly empty body, not JSON `null`, which breaks client-side parsing. It alone replies `{ activeGame: GameStateDto | null }`. Do not extend this wrapper to any other endpoint — if a future endpoint hits the same nullable-body problem, give it its own named wrapper type, don't generalize a shared envelope.

| Situation                           | Response                                              |
| ----------------------------------- | ----------------------------------------------------- |
| New game while one is active        | `409 ACTIVE_GAME_EXISTS`                              |
| Move submitted out of turn          | `409 NOT_YOUR_TURN`                                   |
| Illegal move                        | `422 ILLEGAL_MOVE` plus `illegalCount`, fixed message |
| Review requested for an active game | `403 GAME_NOT_FINISHED`                               |
| Another user's game                 | `403 FORBIDDEN`                                       |
| Engine failure                      | `503 ENGINE_UNAVAILABLE`                              |

**On `503` the user's move stays committed.** Rolling back a move the player has already made in their head desyncs their mental board. Recovery goes through `POST /games/:id/ai-move`, which is idempotent. In every other case the user move and the AI move commit in one transaction.

---

## 6. Out of scope — do not add

Board rendering during a game (permanently excluded) · legal-square highlighting · hidden-notation mode · chess clock · PvP · realtime matchmaking · chat · rankings/ELO · friends · spectating · puzzles · PGN export · social login · logged-out demo play · cancelling an active game (resignation is the only exit)

Review analysis gets no job queue, worker, or polling infrastructure. It runs once inline on first entry to the review screen and caches into `game_analysis`. Roughly 8 seconds for a 40-move game.

---

## 7. Where we are

Phase 1 (chess core) is done — `chess/` and `engine/` services exist with tests.
Next is **Phase 2, the data layer** — Prisma schema, the `one_active_game_per_user` partial unique index, the `finished_fields_consistent` CHECK, and the trigger blocking move inserts on finished games.

The Notion development checklist is the source of truth for phase order and per-phase acceptance criteria. Do not reorder it — the sequence is built so each phase ends with something you can see working.

Run `/blindfold-check` before opening a PR.

---

## 8. Workflow

Claude implements. User reviews. Do not wait for explicit "구현해줘" per task — write code directly, following the phase order in section 7 and the Notion checklist. Open a PR per phase (or per sub-task if large) for review rather than pushing straight to main.
