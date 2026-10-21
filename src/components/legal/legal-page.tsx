import Link from "next/link";

/** Contact shown on the legal pages; NEXT_PUBLIC_CONTACT_EMAIL overrides it. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "loganveny.pro@gmail.com";

export const LAST_UPDATED = "21 octobre 2026";

export function ContactLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-slate-900 underline underline-offset-2">
      {CONTACT_EMAIL}
    </a>
  );
}

/** Shared shell of /privacy and /terms: plain readable page, no dashboard chrome. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/welcome" className="font-semibold text-slate-900">
            Outlr
          </Link>
          <nav className="flex gap-4 text-sm text-slate-500">
            <Link href="/privacy" className="hover:text-slate-900">
              Confidentialité
            </Link>
            <Link href="/terms" className="hover:text-slate-900">
              Conditions
            </Link>
            <Link href="/login" className="hover:text-slate-900">
              Se connecter
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Dernière mise à jour : {LAST_UPDATED}</p>
        <div className="mt-8 flex flex-col gap-8 text-[15px] leading-7 text-slate-700 [&_a]:text-slate-900 [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </main>
      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-slate-400">
          © {new Date().getFullYear()} Outlr · Outlr utilise les services d&apos;API YouTube (YouTube API Services).
        </div>
      </footer>
    </div>
  );
}
