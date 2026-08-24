import clsx from "clsx";
import type { ComponentProps } from "react";

type BadgeVariant = "coral" | "dark" | "default";

type BadgeProps = ComponentProps<"span"> & {
  dot?: boolean;
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, string> = {
  coral: "bg-primary text-on-primary text-[12px] font-semibold tracking-[0.09em] uppercase",
  dark: "bg-surface-dark-elevated border-hairline-dark border text-on-dark text-[13px] font-medium",
  default: "bg-surface-card text-ink text-[13px] font-medium",
};

const dotColors: Record<BadgeVariant, string> = {
  coral: "bg-on-primary",
  dark: "bg-accent-teal",
  default: "bg-accent-teal",
};

const Badge = ({ children, className, dot = false, variant = "default", ...props }: BadgeProps) => (
  <span
    className={clsx("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5", variants[variant], className)}
    {...props}
  >
    {dot && <span aria-hidden="true" className={clsx("size-[7px] rounded-full", dotColors[variant])} />}
    {children}
  </span>
);

export default Badge;
