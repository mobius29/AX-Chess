"use client";

import clsx from "clsx";
import type { ComponentProps, MouseEvent } from "react";

type DialogProps = ComponentProps<"div"> & {
  onClose?: () => void;
  open: boolean;
};

const Dialog = ({ children, className, onClose, open, ...props }: DialogProps) => {
  if (!open) return null;

  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <div
      aria-modal="true"
      className="bg-surface-dark/50 fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
      role="dialog"
    >
      <div
        className={clsx(
          "bg-canvas border-hairline w-full max-w-[420px] rounded-lg border p-6 shadow-[0_28px_80px_rgb(20_20_19_/_0.24)]",
          className,
        )}
        onClick={stop}
        {...props}
      >
        {children}
      </div>
    </div>
  );
};

export default Dialog;
