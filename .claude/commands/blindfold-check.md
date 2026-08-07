---
description: Blindfold integrity audit — required before opening a PR
allowed-tools: Bash, Read, Grep, Glob
---

Audit the current branch's changes for blindfold integrity. This is not a feature review; it is a check on the product's premise. A single failure blocks the merge.

Establish the change surface first:

!`git diff --stat main...HEAD 2>/dev/null || git diff --stat`

Work through the items in order and cite the **file:line** that justifies each verdict. Never pass an item without reading the code.

## A. Response contract

1. Active-game types in `packages/shared` (`GameStateDto` and friends) carry no `fen`, `board`, `pieces`, `legalMoves`, `evaluation`, `bestMove`, or `hint` field.
2. The same fields are absent from DTOs, controllers, and mappers in `apps/api`. Where a line carries a `blindfold-ok` comment, follow the code and confirm the exception really is a finished-game-only path.
3. Error responses carry exactly `{ code, message }` — no `details`, `hint`, `legalMoves`, or other helper fields.
4. The `ILLEGAL_MOVE` response is identical across causes. Parse failures and board-illegal moves are not distinguishable through any code path.

## B. Gates

5. `/games/:id/review` checks `status = finished`. Without that gate the review endpoint is a cheating bypass.
6. Every game endpoint checks ownership. Another user's game ID returns 403.
7. Finished games reject move submissions and result mutations.

## C. Storage and logs

8. The Prisma schema has no FEN column.
9. The board is never persisted or cached by any means other than replay. A `Chess` instance surviving between requests, a memory cache, or session storage all violate this.
10. Logs and error reporting never emit FEN, legal move lists, active-game evaluations, raw JWTs, or password hashes. Check the engine's UCI debug output path specifically.

## D. Frontend

11. The game screen contains no board, piece layout, or coordinate grid. The board component is imported only from the review route.
12. The proxy strips `accessToken` from the login response body. Leaving it there defeats the httpOnly wrapper.

## E. Timing

13. Illegal-move response time does not vary by cause. Check specifically whether any engine call sits on the illegal-move path, since that leaks the cause through timing.

---

**Output** — one line per item: `pass / fail / not applicable`. Format failures as `file:line — what is wrong — how to fix it`. Close with a single line on whether it can merge. Do not praise or summarize the passing items.

$ARGUMENTS
