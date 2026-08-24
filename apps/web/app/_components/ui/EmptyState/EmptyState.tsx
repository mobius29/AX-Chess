import type { ReactNode } from "react";

type EmptyStateProps = { action?: ReactNode; body: string; title: string };

const EmptyState = ({ action, body, title }: EmptyStateProps) => (
  <div className="border-hairline flex w-full flex-col items-center gap-4 rounded-lg border border-dashed px-8 py-14">
    <span aria-hidden="true" className="bg-primary size-[18px] rotate-45 rounded-[1px]" />
    <p className="text-title-3 text-ink text-center font-semibold">{title}</p>
    <p className="text-body-3 text-muted max-w-[340px] text-center">{body}</p>
    {action}
  </div>
);

export default EmptyState;
