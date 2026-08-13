import clsx from "clsx";
import type { ReactNode } from "react";

type TitleLevel = 1 | 2 | 3 | 4 | 5;
type BodyLevel = 1 | 2 | 3;
type CaptionLevel = 1 | 2 | 3;

type TextProps = {
  children: ReactNode;
  className?: string;
};

const titleClasses: Record<TitleLevel, string> = {
  1: "text-title-1",
  2: "text-title-2",
  3: "text-title-3",
  4: "text-title-4",
  5: "text-title-5",
};

const titleTags: Record<TitleLevel, "h1" | "h2" | "h3" | "h4" | "h5"> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
};

const bodyClasses: Record<BodyLevel, string> = {
  1: "text-body-1",
  2: "text-body-2",
  3: "text-body-3",
};

const captionClasses: Record<CaptionLevel, string> = {
  1: "text-caption-1",
  2: "text-caption-2",
  3: "text-caption-3 uppercase",
};

export const Title = ({ children, className, level = 3 }: TextProps & { level?: TitleLevel }) => {
  const Heading = titleTags[level];
  return <Heading className={clsx(titleClasses[level], className)}>{children}</Heading>;
};

export const Body = ({ children, className, level = 2 }: TextProps & { level?: BodyLevel }) => {
  return <p className={clsx(bodyClasses[level], className)}>{children}</p>;
};

export const Caption = ({ children, className, level = 1 }: TextProps & { level?: CaptionLevel }) => {
  return <p className={clsx(captionClasses[level], className)}>{children}</p>;
};
