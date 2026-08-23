import type { GameStateDto } from "@ax-chess/shared";

import { Button } from "@/app/_components/ui/Button";
import { Dialog } from "@/app/_components/ui/Dialog";
import { Body, Title } from "@/app/_components/ui/Typography";
import { ENDED_REASON_LABEL, RESULT_LABEL } from "@/app/_lib/labels";

const GameFinishedDialog = ({ game, onHome }: { game: GameStateDto; onHome: () => void }) => (
  <Dialog open>
    <Title level={3} tone="ink">
      {game.result && RESULT_LABEL[game.result]}
    </Title>
    <Body className="mt-2" tone="muted">
      {game.endedReason && ENDED_REASON_LABEL[game.endedReason]} · {game.moveCount}수 · 실착수 {game.illegalCount}
    </Body>
    <Button className="mt-6" onClick={onHome} type="button">
      홈으로
    </Button>
  </Dialog>
);

export default GameFinishedDialog;
