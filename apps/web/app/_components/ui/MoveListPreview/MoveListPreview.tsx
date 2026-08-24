import clsx from "clsx";

type PlyRow = { black?: string; no: number; white: string };

type MoveListPreviewProps = {
  className?: string;
  highlightLast?: boolean;
  rows: PlyRow[];
};

const MoveListPreview = ({ className, highlightLast = false, rows }: MoveListPreviewProps) => (
  <div className={clsx("flex flex-col gap-1 text-[13px] leading-[1.95]", className)}>
    {rows.map(({ black, no, white }, i) => {
      const cellClass = highlightLast && i === rows.length - 1 ? "text-primary" : "text-on-dark";
      return (
        <div className="flex items-center" key={no}>
          <span className="text-notation-muted w-[34px]">{no}.</span>
          <span className={clsx("flex-1", cellClass)}>{white}</span>
          <span className={clsx("flex-1", cellClass)}>{black}</span>
        </div>
      );
    })}
  </div>
);

export default MoveListPreview;
