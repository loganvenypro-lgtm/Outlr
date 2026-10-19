import Link from "next/link";
import { 
  Flame, 
  ArrowRight, 
  TrendingUp, 
  Search, 
  Sparkles, 
  Zap, 
  BarChart3, 
  CheckCircle2, 
  ShieldCheck, 
  Tv, 
  Eye, 
  DollarSign 
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-600 selection:text-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex size-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
              <Flame className="size-4 fill-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">Outlr</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link href="/channel-trends" className="hover:text-white transition-colors">
              Channel Trends
            </Link>
            <Link href="/niche-finder" className="hover:text-white transition-colors">
              Viral Niche Finder
            </Link>
            <Link href="/trending" className="hover:text-white transition-colors">
              Radar 24h
            </Link>
            <Link href="/sponsors" className="hover:text-white transition-colors">
              Tarifs
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-2 rounded-xl hover:bg-slate-900 transition-all"
            >
              Se connecter
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-blue-600/25 transition-all"
            >
              Essai Gratuit <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 max-w-6xl mx-auto text-center overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 blur-[140px] pointer-events-none rounded-full" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-semibold mb-6">
          <Sparkles className="size-3.5" /> Moteur de découverte YouTube IA & Outliers
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1] max-w-4xl mx-auto">
          Détectez les vidéos qui explosent <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400">avant tout le monde.</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Analysez les multiplicateurs de vues réels, repérez les micro-chaînes virales et explorez les niches YouTube à forte demande sans limite de quota.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-7 py-3.5 rounded-2xl shadow-xl shadow-blue-600/30 transition-all hover:scale-[1.02]"
          >
            Commencer maintenant <ArrowRight className="size-4" />
          </Link>
          <Link
              href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold text-sm px-6 py-3.5 rounded-2xl transition-all"
          >
            Voir la démo en direct
          </Link>
        </div>

        {/* Feature bullets */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-400" /> +3 500 chaînes surveillées
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-400" /> Détection des Shorts & Longform
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-400" /> Alertes pépites en direct
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-7 relative group hover:border-slate-700 transition-all">
            <div className="size-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-5">
              <TrendingUp className="size-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Channel Trends 24h</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Suivez les chaînes qui génèrent des pics de volume anormaux sur les dernières 24 et 48 heures.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-7 relative group hover:border-slate-700 transition-all">
            <div className="size-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-5">
              <Zap className="size-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Multiplicateur Outlier</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Algorithme propriétaire isolant les vidéos qui font 5x à 50x la moyenne habituelle de leur créateur.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-7 relative group hover:border-slate-700 transition-all">
            <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5">
              <Tv className="size-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Filtre Shorts & Longs</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Passez d'un clic entre le flux YouTube Shorts vertical (9:16) et les grands documentaires longform.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-10 px-6 text-center text-xs text-slate-500">
        <p>© 2026 Outlr — Tous droits réservés. Radar de contenu et intelligence créateur.</p>
      </footer>
    </div>
  );
}
