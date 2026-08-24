import clsx from "clsx";
import NextLink from "next/link";
import type { ComponentProps } from "react";

type LinkVariant = "primary" | "secondary" | "text";
type LinkSize = "default" | "sm";

type LinkProps = ComponentProps<typeof NextLink> & {
  size?: LinkSize;
  variant?: LinkVariant;
};

const variants: Record<LinkVariant, string> = {
  primary:
    "bg-primary-active inline-flex items-center justify-center rounded-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:opacity-90",
  secondary:
    "border-hairline text-body-strong hover:bg-surface-soft inline-flex items-center justify-center rounded-sm border bg-transparent font-semibold transition-colors",
  text: "text-primary hover:text-primary-active font-semibold transition-colors",
};

const sizes: Record<LinkSize, string> = {
  default: "h-12 px-6 text-[15px]",
  sm: "px-4 py-2.5 text-[14px]",
};

const focusClasses = "focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2";

const Link = ({ className, size = "default", variant, ...props }: LinkProps) => (
  <NextLink
    className={clsx(
      focusClasses,
      variant && variants[variant],
      variant && variant !== "text" && sizes[size],
      className,
    )}
    {...props}
  />
);

type BrandLinkProps = LinkProps & { tone?: "dark" | "light" };

const brandTones: Record<"dark" | "light", string> = {
  dark: "text-ink",
  light: "text-on-dark",
};

export const BrandLink = ({ className, children = "AX Chess", tone = "dark", ...props }: BrandLinkProps) => (
  <Link
    className={clsx(
      "inline-flex items-center gap-2.5",
      "text-[17px] leading-none font-semibold tracking-[-0.3px]",
      brandTones[tone],
      className,
    )}
    {...props}
  >
    <span aria-hidden="true" className="bg-primary size-3.5 rotate-45 rounded-[1px]" />
    {children}
  </Link>
);

export default Link;
