import clsx from "clsx";

type SegmentedProps<T extends string> = {
  onChange: (value: T) => void;
  options: readonly { label: string; value: T }[];
  value: T;
};

const Segmented = <T extends string>({ onChange, options, value }: SegmentedProps<T>) => (
  <div className="bg-surface-card inline-flex gap-[3px] rounded-sm p-[3px]">
    {options.map((option) => (
      <button
        className={clsx(
          "h-[34px] rounded-md px-[22px] text-[14px] font-medium transition-colors",
          option.value === value ? "bg-canvas text-ink shadow-sm" : "text-muted",
        )}
        key={option.value}
        onClick={() => onChange(option.value)}
        type="button"
      >
        {option.label}
      </button>
    ))}
  </div>
);

export default Segmented;
