import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLinks } from "@/components/NavLinks";
import { ThemeScript } from "@/components/ThemeScript";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvestOS",
  description: "Personal investing decision system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="relative min-h-screen overflow-x-hidden">
        <div className="ambient-blob one" aria-hidden />
        <div className="ambient-blob two" aria-hidden />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-6">
          <header className="flex flex-wrap items-center justify-between gap-4 pb-6">
            <Link href="/" className="group flex items-center gap-2">
              <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-fg text-bg font-bold transition-transform duration-300 group-hover:scale-105">
                <span className="relative z-10">i</span>
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: "linear-gradient(135deg, rgb(var(--brand)), rgb(var(--accent)))",
                  }}
                />
              </div>
              <div className="leading-tight">
                <div className="text-lg font-semibold shimmer-text">InvestOS</div>
                <div className="text-xs text-fgMuted">Decide, don&apos;t drift.</div>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <NavLinks />
              <ThemeToggle />
            </div>
          </header>
          <main className="animate-fade-in-up">{children}</main>
          <footer className="mt-16 pt-4 text-xs text-fgMuted" style={{ borderTop: "1px solid rgb(var(--border) / var(--border-alpha))" }}>
            Data via Yahoo Finance. For personal use. Not investment advice.
          </footer>
        </div>
      </body>
    </html>
  );
}
