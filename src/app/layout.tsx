import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Talk : brainstorm entre IA",
  description: "Faites travailler plusieurs IA ensemble, chacune avec sa personnalité.",
};

const NAV = [
  { href: "/", label: "Sessions" },
  { href: "/personas", label: "Personnalités" },
  { href: "/keys", label: "Clés API" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Talk
            </Link>
            <nav className="flex gap-4 text-sm text-zinc-600">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-zinc-900">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
