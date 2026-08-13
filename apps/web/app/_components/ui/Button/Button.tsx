import clsx from "clsx";
import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button">;

const Button = ({ className, ...props }: ButtonProps) => (
  <button
    className={clsx(
      "bg-primary hover:bg-primary-active focus-visible:outline-primary h-12 w-full rounded-sm px-[26px] text-[15px] leading-none font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-primary-disabled",
      className,
    )}
    {...props}
  />
);

export default Button;
