import clsx from "clsx";

const OptionButton = ({ onClick, label, selected }: { label: string; onClick: () => void; selected: boolean }) => (
  <button
    aria-pressed={selected}
    className={clsx(
      "border-hairline rounded-sm border px-5 py-3 text-[15px] font-semibold transition-colors",
      selected ? "bg-primary text-white" : "bg-canvas text-body-strong hover:bg-surface-soft",
    )}
    onClick={onClick}
    type="button"
  >
    {label}
  </button>
);

export default OptionButton;
