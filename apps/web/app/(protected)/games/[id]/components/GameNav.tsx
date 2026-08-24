import type { Color, Difficulty } from "@ax-chess/shared";

import { Badge } from "@/app/_components/ui/Badge";
import { BrandLink } from "@/app/_components/ui/Link";
import { COLOR_LABEL, DIFFICULTY_LABEL } from "@/app/_lib/labels";

const GameNav = ({ color, difficulty }: { color: Color; difficulty: Difficulty }) => (
  <div className="border-hairline-dark flex h-16 items-center justify-between border-b px-8">
    <BrandLink href="/" tone="light" />
    <div className="flex items-start gap-3">
      <Badge variant="dark">{COLOR_LABEL[color]}</Badge>
      <Badge variant="dark">{DIFFICULTY_LABEL[difficulty]}</Badge>
    </div>
  </div>
);

export default GameNav;
