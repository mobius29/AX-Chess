import clsx from "clsx";
import NextLink from "next/link";
import type { ComponentProps } from "react";

type LinkVariant = "primary" | "secondary" | "text";

type LinkProps = ComponentProps<typeof NextLink> & {
  variant?: LinkVariant;
};

const variants: Record<LinkVariant, string> = {
  primary:
    "bg-primary-active inline-flex h-12 items-center justify-center rounded-sm px-6 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:opacity-90",
  secondary:
    "border-hairline text-body-strong hover:bg-surface-soft inline-flex h-12 items-center justify-center rounded-sm border bg-transparent px-6 text-[15px] font-semibold transition-colors",
  text: "text-primary hover:text-primary-active font-semibold transition-colors",
};

const focusClasses =
  "focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2";

const Link = ({ className, variant, ...props }: LinkProps) => (
  <NextLink
    className={clsx(focusClasses, variant && variants[variant], className)}
    {...props}
  />
);

export const BrandLink = ({ className, children = "AX Chess", ...props }: LinkProps) => (
  <Link
    className={clsx(
      "text-ink inline-flex items-center gap-2.5 text-[17px] leading-none font-semibold tracking-[-0.3px]",
      className,
    )}
    {...props}
  >
    <span aria-hidden="true" className="bg-primary size-3.5 rotate-45 rounded-[1px]" />
    {children}
  </Link>
);

export default Link;
