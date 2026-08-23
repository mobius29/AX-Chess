"use client";

import { clsx } from "clsx";
import type { ComponentProps } from "react";

type DialogProps = ComponentProps<"div"> & {
  onClose?: () => void;
  open: boolean;
};

const Dialog = ({ children, className, onClose, open, ...props }: DialogProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {onClose ? (
        <button aria-label="닫기" className="bg-surface-dark/50 absolute inset-0" onClick={onClose} type="button" />
      ) : (
        <div aria-hidden className="bg-surface-dark/50 absolute inset-0" />
      )}
      <div
        aria-modal="true"
        className={clsx(
          "bg-canvas border-hairline relative w-full max-w-[420px] rounded-lg border p-6 shadow-[0_28px_80px_rgb(20_20_19_/_0.24)]",
          className,
        )}
        role="dialog"
        {...props}
      >
        {children}
      </div>
    </div>
  );
};

export default Dialog;
