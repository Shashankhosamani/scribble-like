import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scribble!",
  description: "Draw. Guess. Win.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      {/* Set theme before first paint to avoid flash */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t = localStorage.getItem('scribble-theme');
            if (t === 'Chalk' || t === 'Arcade') {
              document.documentElement.setAttribute('data-theme', t.toLowerCase());
            }
          })();
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
