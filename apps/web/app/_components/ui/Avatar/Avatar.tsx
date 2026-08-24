import clsx from "clsx";

type AvatarProps = { className?: string; nickname: string };

const Avatar = ({ className, nickname }: AvatarProps) => (
  <span
    className={clsx(
      "bg-surface-cream-strong text-ink flex size-[30px] shrink-0 items-center justify-center rounded-full text-[12px] font-medium",
      className,
    )}
  >
    {nickname.slice(0, 2).toUpperCase()}
  </span>
);

export default Avatar;
