import { HomeWelcome } from "@/components/home/HomeWelcome";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <HomeWelcome />
      <footer className="mx-auto max-w-[1200px] px-6 pb-16 pt-4 md:px-10">
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200/70 pt-8 text-[13px] text-slate-500 sm:flex-row">
          <p>
            <span className="font-semibold text-slate-500">Outlr</span> — radar de vidéos atypiques YouTube.
          </p>
          <p>Données actualisées en continu · Médianes intelligentes par chaîne</p>
        </div>
      </footer>
    </div>
  );
}
