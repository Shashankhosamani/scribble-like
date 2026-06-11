import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scribble!",
  description: "Draw. Guess. Win.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
