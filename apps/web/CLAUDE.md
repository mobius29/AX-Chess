@AGENTS.md

# apps/web — blindfold rules

The root `CLAUDE.md` takes precedence. Only the points that actually break on the frontend are listed here.

## Never build a board into the game screen

Do not render a chessboard, piece layout, or coordinate grid in any form. "A small minimap for convenience" is the most common way this product fails. The board component is imported **only** in the review route.

The game screen consists of exactly this: the move list (numbered, two columns for white and black, auto-scrolled to the latest move), the move input, the status bar (turn, color, difficulty, move count, illegal count), the check banner, and the resign button.

## Proxy (`app/api/[...proxy]/route.ts`)

No logic. Two exceptions only.

- `POST /api/auth/login` — move `accessToken` from the BE response into `Set-Cookie` and **strip it from the body.** Leaving it in the body defeats the point of httpOnly.
- `POST /api/auth/logout` — expire the cookie. No BE call.

Cookie: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`. Client JS must never be able to read the token.

The first call to `/api/games/:id/review` takes about 8 seconds for a 40-move game. Set the proxy timeout to 30 seconds or more.

## Game screen state machine

`loading` → `ready` → `submitting` → (`ready` | `finished` | `engineRetry`)

| State       | Input            | Display                                  |
| ----------- | ---------------- | ---------------------------------------- |
| loading     | disabled         | skeleton                                 |
| ready       | enabled, focused | "your turn"                              |
| submitting  | disabled         | "AI is thinking"                         |
| engineRetry | disabled         | retry button → `POST /games/:id/ai-move` |
| finished    | hidden           | result modal                             |

**Do not clear the input when returning to `ready` on `422 ILLEGAL_MOVE`.** Forcing a retype over a single typo breaks blindfold concentration. Display the fixed message the server sent verbatim; the client never guesses at a cause and adds to it.

## Types

Take API response types from `@ax-chess/shared`. Do not redeclare them for view code. Never add runtime values to that package — types only is what keeps the sources directly referenceable with no build step.
