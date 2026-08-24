import type { ReactNode } from "react";

type AuthPanelProps = {
  body: ReactNode;
  eyebrow: string;
  footer: string;
  title: ReactNode;
};

const AuthPanel = ({ body, eyebrow, footer, title }: AuthPanelProps) => (
  <div className="bg-surface-dark hidden h-full w-[660px] shrink-0 flex-col justify-between px-14 py-16 lg:flex">
    <div className="flex flex-col gap-4">
      <p className="text-caption-3 text-on-dark-soft">{eyebrow}</p>
      <h2 className="text-title-2 text-on-dark font-semibold">{title}</h2>
    </div>
    {body}
    <p className="text-body-3 text-on-dark-soft">{footer}</p>
  </div>
);

export default AuthPanel;
