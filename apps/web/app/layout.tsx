import type { Metadata } from "next";

import "./globals.css";
import { pretendard } from "./fonts";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "AX-Chess",
  description: "Blindfold Chess with AI",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.className} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
