import clsx from "clsx";
import type { ComponentProps } from "react";

type ButtonVariant = "primary" | "text";
type ButtonSize = "default" | "sm";

type ButtonProps = ComponentProps<"button"> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-active disabled:bg-primary-disabled",
  text: "text-muted hover:text-primary-active disabled:opacity-50",
};

const sizes: Record<ButtonSize, string> = {
  default: "h-12 w-full px-[26px] text-[15px] leading-none",
  sm: "px-3 py-2 text-[14px]",
};

const Button = ({ className, size = "default", variant = "primary", ...props }: ButtonProps) => (
  <button
    className={clsx(
      "rounded-sm font-semibold transition-colors",
      "focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2",
      "disabled:cursor-not-allowed",
      variants[variant],
      sizes[size],
      className,
    )}
    {...props}
  />
);

export default Button;
