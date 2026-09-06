import localFont from "next/font/local";

export const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
});

export const googleButtonFont = localFont({
  src: "./fonts/Roboto-Medium.ttf",
  weight: "500",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});
