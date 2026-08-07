#!/usr/bin/env bash
# Blindfold integrity guard
#
# Blocks board-state fields from entering client-facing contract files (shared
# types, DTOs, controllers, mappers) at write time. Service internals are not
# checked — the layer that drives chess.js uses FEN legitimately.
#
# Legitimate exceptions (review responses and other finished-game-only paths)
# pass by carrying a `blindfold-ok: <reason>` comment on that line.
set -uo pipefail

payload=$(cat)
file=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')

[ -n "$file" ] || exit 0
[ -f "$file" ] || exit 0

case "$file" in
  */packages/shared/src/*) ;;
  */apps/api/src/*dto*) ;;
  */apps/api/src/*controller*) ;;
  */apps/api/src/*mapper*) ;;
  *) exit 0 ;;
esac

# Skip comment-only lines. Only code lines can leak a field, and matching prose
# that describes the rule forces an exception comment onto every sentence.
hits=$(grep -nEi '(^|[^a-z])(fen|board|pieces|legal_?moves|evaluation|eval_?cp|best_?move|hint)([^a-z]|$)' "$file" \
  | grep -vE '^[0-9]+:[[:space:]]*(\*|//|/\*)' \
  | grep -v 'blindfold-ok' || true)

[ -n "$hits" ] || exit 0

{
  echo "Blindfold integrity guard — board-state field in a contract file: $file"
  echo
  echo "$hits"
  echo
  echo "Active-game (status=active) responses must not carry fen/board/pieces/legalMoves/evaluation/bestMove/hint. (PRD 8.1)"
  echo "If this is finished-game-only, like the GET /games/:id/review response, add a \`blindfold-ok: <reason>\` comment on that line."
} >&2

exit 2
