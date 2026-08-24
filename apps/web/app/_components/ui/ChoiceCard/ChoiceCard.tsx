import clsx from "clsx";

type ChoiceCardProps = {
  onClick: () => void;
  selected: boolean;
  sub: string;
  title: string;
};

const ChoiceCard = ({ onClick, selected, sub, title }: ChoiceCardProps) => (
  <button
    aria-pressed={selected}
    className={clsx(
      "bg-canvas flex flex-1 flex-col gap-1 rounded-md border p-4 text-left transition-colors",
      selected ? "border-primary shadow-[0_0_0_3px_rgb(204_120_92_/_0.15)]" : "border-hairline hover:bg-surface-soft",
    )}
    onClick={onClick}
    type="button"
  >
    <p className="text-ink text-[16px] font-medium">{title}</p>
    <p className="text-muted-soft text-[12px]">{sub}</p>
  </button>
);

export default ChoiceCard;
