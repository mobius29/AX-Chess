import clsx from "clsx";
import type { ComponentProps } from "react";

type TitleLevel = 1 | 2 | 3 | 4 | 5;
type BodyLevel = 1 | 2 | 3;
type CaptionLevel = 1 | 2 | 3;
type TextTone = "error" | "ink" | "muted";

type TitleProps = ComponentProps<"h1"> & {
  level?: TitleLevel;
  tone?: TextTone;
};

type ParagraphProps = ComponentProps<"p"> & {
  tone?: TextTone;
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

const tones: Record<TextTone, string> = {
  error: "text-error",
  ink: "text-ink",
  muted: "text-muted",
};

export const Title = ({ className, level = 3, tone, ...props }: TitleProps) => {
  const Heading = titleTags[level];
  return <Heading className={clsx(titleClasses[level], tone && tones[tone], className)} {...props} />;
};

export const Body = ({ className, level = 2, tone, ...props }: ParagraphProps & { level?: BodyLevel }) => (
  <p className={clsx(bodyClasses[level], tone && tones[tone], className)} {...props} />
);

export const Caption = ({ className, level = 1, tone, ...props }: ParagraphProps & { level?: CaptionLevel }) => (
  <p className={clsx(captionClasses[level], tone && tones[tone], className)} {...props} />
);
