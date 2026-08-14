import clsx from "clsx";
import type { ComponentProps } from "react";

type FormProps = ComponentProps<"form">;
type FormFieldProps = Omit<ComponentProps<"input">, "name"> & {
  hint?: string;
  label: string;
  name: string;
};

const Form = ({ className, ...props }: FormProps) => <form className={clsx("space-y-5", className)} {...props} />;

export const FormField = ({ className, hint, id, label, name, ...props }: FormFieldProps) => {
  const inputId = id ?? name;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <label className="text-body-strong block text-[13px] leading-[1.4] font-medium" htmlFor={inputId}>
      {label}
      <input
        aria-describedby={hintId}
        className={clsx(
          "mt-2 h-10 w-full rounded-sm border px-3.5 text-base leading-[1.2]",
          "border-hairline bg-canvas text-ink placeholder:text-muted-soft",
          "outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgb(204_120_92_/_0.15)]",
          className,
        )}
        id={inputId}
        name={name}
        {...props}
      />
      {hint && (
        <span className="text-muted-soft mt-2 block text-[12px] leading-[1.3]" id={hintId}>
          {hint}
        </span>
      )}
    </label>
  );
};

export default Form;
