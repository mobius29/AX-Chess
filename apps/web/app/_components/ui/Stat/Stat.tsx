type StatProps = { label: string; value: string };

const Stat = ({ label, value }: StatProps) => (
  <div className="flex w-[244px] flex-col gap-1">
    <p className="text-ink text-[34px] leading-none font-medium tabular-nums">{value}</p>
    <p className="text-body-3 text-muted">{label}</p>
  </div>
);

export default Stat;
