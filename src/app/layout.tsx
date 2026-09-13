import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRIME TECHNICAL MASTER",
  description: "NSE F&O • Prime Technical Scanner • Upstox Market Data",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#070b14] text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
