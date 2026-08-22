import clsx from "clsx";
import type { ComponentProps } from "react";

type InputProps = ComponentProps<"input">;

const Input = ({ className, ...props }: InputProps) => (
  <input
    className={clsx(
      "border-hairline bg-canvas text-ink placeholder:text-muted-soft rounded-sm border px-3.5",
      "outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgb(204_120_92_/_0.15)]",
      "disabled:opacity-50",
      className,
    )}
    {...props}
  />
);

export default Input;
