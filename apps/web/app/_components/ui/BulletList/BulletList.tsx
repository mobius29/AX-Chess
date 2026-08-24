type BulletListProps = { items: string[] };

const BulletList = ({ items }: BulletListProps) => (
  <ul className="flex w-full flex-col gap-3">
    {items.map((item) => (
      <li className="flex items-center gap-3" key={item}>
        <span aria-hidden="true" className="bg-primary size-2.5 shrink-0 rotate-45 rounded-[1px]" />
        <p className="text-body-3 text-on-dark flex-1">{item}</p>
      </li>
    ))}
  </ul>
);

export default BulletList;
