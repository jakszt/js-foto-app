import type { Metadata } from "next";
import { Lexend } from "next/font/google";

import "./globals.css";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Jakub Sztuba — rozliczenie po sesji",
  description: "Opłać zdjęcia po sesji fotograficznej — szybka płatność online przez inFakt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={`${lexend.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
