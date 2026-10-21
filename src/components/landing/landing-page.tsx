"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  Compass,
  Flame,
  Image as ImageIcon,
  LayoutGrid,
  Radar,
  Search,
  Sparkles,
  Telescope,
  TrendingUp,
  Type,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CountUp,
  Reveal,
  SpotlightCard,
  Typewriter,
  VideoCard,
  formatCompact,
  formatMultiplier,
  type LandingVideo,
} from "./landing-parts";

export type { LandingVideo };

interface LandingPageProps {
  videos: LandingVideo[];
  niches: { name: string; videos: LandingVideo[] }[];
  stats: { videos: number; channels: number; topMultiplier: number };
}

const NAV_LINKS = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#demo", label: "Démo" },
  { href: "#methode", label: "Méthode" },
  { href: "#faq", label: "FAQ" },
];

const SEARCH_EXAMPLES = ["true crime", "minecraft challenge", "rise and fall", "dropshipping", "cuisine facile", "video essay"];

export function LandingPage({ videos, niches, stats }: LandingPageProps) {
  const heroVideos = videos.slice(0, 6);
  const marqueeTop = videos.slice(6, 22);
  const marqueeBottom = videos.slice(22, 38);

  return (
    <div className="lp-root relative min-h-screen overflow-x-clip bg-[#07070b] text-white selection:bg-orange-500/30">
      <Navbar />
      <Hero videos={heroVideos} />
      <Marquee top={marqueeTop} bottom={marqueeBottom} />
      <StatsBand stats={stats} />
      <OutlierExplainer />
      <Features videos={videos} />
      <NicheExplorer niches={niches} />
      <Method />
      <Comparison />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

// --- LOGO ---

function Logo() {
  return (
    <Link href="/welcome" className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-xl bg-white/[0.06] p-1.5 ring-1 ring-white/10">
        <img src="/outlr-logo.png" alt="" className="size-full object-contain" />
      </span>
      <span className="text-lg font-bold tracking-tight">Outlr</span>
    </Link>
  );
}

// --- NAVBAR ---

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3">
      <nav
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl px-4 transition-all duration-300",
          scrolled ? "border border-white/10 bg-[#0b0b12]/70 shadow-2xl shadow-black/40 backdrop-blur-xl" : "border border-transparent"
        )}
      >
        <Logo />
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:text-white sm:block">
            Se connecter
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-white/90 hover:shadow-[0_0_24px_rgba(255,255,255,0.25)]"
          >
            Essayer Outlr
          </Link>
        </div>
      </nav>
    </header>
  );
}

// --- HERO ---

function Hero({ videos }: { videos: LandingVideo[] }) {
  const frameRef = useRef<HTMLDivElement>(null);

  // The product frame starts tilted and flattens as the visitor scrolls.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onScroll = () => {
      const p = Math.min(1, window.scrollY / 500);
      el.style.transform = `perspective(1600px) rotateX(${14 * (1 - p)}deg) scale(${0.94 + 0.06 * p})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="relative px-4 pb-24 pt-36 sm:pt-44">
      {/* Backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="lp-grid absolute inset-0" />
        <div className="lp-aurora absolute left-[calc(50%-35rem)] top-[-18rem] h-[42rem] w-[70rem] rounded-full" />
      </div>

      <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
        <Reveal>
          <a
            href="#demo"
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-xs text-white/70 backdrop-blur transition-colors hover:border-white/20"
          >
            <span className="rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-2 py-0.5 font-semibold text-white">Live</span>
            Le radar des vidéos qui explosent sur YouTube
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </a>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-7 text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-7xl">
            Trouvez la vidéo qui fera{" "}
            <span className="lp-gradient-text">10×</span> votre moyenne.
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-white/55">
            Outlr repère les vidéos qui écrasent la moyenne de leur chaîne. Vous voyez quels sujets, titres et
            miniatures marchent dans votre niche, avant que tout le monde les copie.
          </p>
        </Reveal>

        <Reveal delay={240} className="w-full">
          <Link
            href="/login"
            className="lp-glow-border group mx-auto mt-9 flex w-full max-w-xl items-center gap-3 rounded-2xl bg-[#0d0d14] p-2 pl-4 text-left"
          >
            <Search className="size-5 shrink-0 text-white/40" />
            <span className="flex-1 truncate text-white/80">
              <Typewriter words={SEARCH_EXAMPLES} />
            </span>
            <span className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition-transform group-hover:scale-[1.03]">
              Scanner <ArrowRight className="size-4" />
            </span>
          </Link>
        </Reveal>

        <Reveal delay={320}>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/45">
            {["Long format et Shorts", "Toutes les langues", "Aucun accès à votre compte YouTube"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="size-3.5 text-orange-400" /> {t}
              </span>
            ))}
          </div>
        </Reveal>
      </div>

      {/* Product frame */}
      <Reveal delay={200} className="relative mx-auto mt-20 max-w-6xl">
        <div aria-hidden className="absolute -inset-x-10 -top-10 bottom-0 rounded-[3rem] bg-gradient-to-b from-orange-500/20 via-rose-500/10 to-transparent blur-3xl" />
        <div ref={frameRef} className="relative origin-top transition-transform duration-150 ease-out will-change-transform">
          <AppFrame videos={videos} />
        </div>
      </Reveal>
    </section>
  );
}

function AppFrame({ videos }: { videos: LandingVideo[] }) {
  const sideIcons = [LayoutGrid, Flame, TrendingUp, Compass, ImageIcon, Type, Wallet];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c13]/90 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/5 backdrop-blur">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="mx-auto rounded-md bg-white/[0.04] px-16 py-1 text-[11px] text-white/35">outlr.app/outliers</span>
      </div>

      <div className="flex">
        <aside className="hidden w-14 shrink-0 flex-col items-center gap-3 border-r border-white/[0.06] py-5 sm:flex">
          {sideIcons.map((Icon, i) => (
            <span key={i} className={cn("flex size-8 items-center justify-center rounded-lg", i === 1 ? "bg-white/10 text-white" : "text-white/30")}>
              <Icon className="size-4" />
            </span>
          ))}
        </aside>

        <div className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Outliers</p>
              <p className="text-xs text-white/40">Vidéos qui surperforment leur chaîne</p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {["Long format", "Outlier ≥ 10×", "Toutes chaînes", "Tri : score viral"].map((f, i) => (
                <span
                  key={f}
                  className={cn(
                    "rounded-lg border px-2.5 py-1",
                    i === 1 ? "border-orange-400/40 bg-orange-400/10 text-orange-200" : "border-white/10 bg-white/[0.03] text-white/55"
                  )}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-3">
            {videos.map((v, i) => (
              <div key={v.id} className={cn(i >= 4 && "hidden lg:block")}>
                <VideoCard video={v} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MARQUEE ---

function Marquee({ top, bottom }: { top: LandingVideo[]; bottom: LandingVideo[] }) {
  if (top.length < 4) return null;

  const Row = ({ items, reverse }: { items: LandingVideo[]; reverse?: boolean }) => (
    <div className="lp-marquee-mask flex overflow-hidden">
      <div className={cn("lp-marquee flex shrink-0 gap-4 pr-4", reverse && "lp-marquee-reverse")}>
        {[...items, ...items].map((v, i) => (
          <div key={`${v.id}-${i}`} className="relative w-60 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10" aria-hidden={i >= items.length}>
            <img src={v.thumbnail} alt="" loading="lazy" className="aspect-video w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
            <span className="absolute left-2 top-2 rounded-md bg-gradient-to-r from-rose-500 to-orange-400 px-1.5 py-0.5 text-[11px] font-bold">
              {formatMultiplier(v.outlierMultiplier)}
            </span>
            <p className="absolute inset-x-2.5 bottom-2 line-clamp-1 text-xs font-medium text-white/90">{v.title}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section className="relative py-10">
      <Reveal>
        <p className="mb-8 text-center text-xs font-medium uppercase tracking-[0.2em] text-white/35">
          Quelques outliers repérés par Outlr
        </p>
      </Reveal>
      <div className="flex flex-col gap-4">
        <Row items={top} />
        {bottom.length >= 4 && <Row items={bottom} reverse />}
      </div>
    </section>
  );
}

// --- STATS ---

function StatsBand({ stats }: { stats: LandingPageProps["stats"] }) {
  const items = [
    { value: <CountUp value={stats.videos} />, label: "vidéos virales indexées" },
    { value: <CountUp value={stats.channels} />, label: "chaînes analysées" },
    { value: <CountUp value={stats.topMultiplier} prefix="×" />, label: "meilleur outlier en vitrine" },
  ];

  return (
    <section className="px-4 py-16">
      <div className="mx-auto grid max-w-5xl gap-px overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-3">
        {items.map((item, i) => (
          <Reveal key={i} delay={i * 100} className="bg-[#09090f] px-8 py-10 text-center">
            <p className="lp-gradient-text-soft text-5xl font-semibold tracking-tight">{item.value}</p>
            <p className="mt-2 text-sm text-white/45">{item.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// --- WHY OUTLIERS ---

function OutlierExplainer() {
  // A channel whose uploads hover around its median, plus one breakout.
  const bars = [32, 41, 28, 36, 44, 30, 38, 100, 35, 40];

  return (
    <section className="px-4 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
        <Reveal>
          <SectionEyebrow icon={Telescope}>Pourquoi les outliers</SectionEyebrow>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Les mots-clés vous disent ce qu&apos;on cherche. Les outliers, ce qu&apos;on regarde.
          </h2>
          <p className="mt-5 text-lg text-white/55">
            Un outlier, c&apos;est une vidéo qui fait bien plus de vues que la médiane de sa propre chaîne. Quand une
            chaîne de 6 000 abonnés sort une vidéo à 500 000 vues, ce n&apos;est pas la taille de la chaîne qui a joué.
            C&apos;est le sujet, le titre et la miniature. C&apos;est exactement ça que vous voulez reproduire.
          </p>
          <ul className="mt-8 space-y-3 text-white/70">
            {[
              "Comparé à la chaîne elle-même, pas à tout YouTube",
              "Les petites chaînes ressortent autant que les géants",
              "Des signaux frais, pas des tendances déjà saturées",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-400/15">
                  <Check className="size-3 text-orange-300" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120}>
          <SpotlightCard className="p-6 sm:p-8">
            <div className="flex items-center justify-between text-xs text-white/45">
              <span>10 dernières vidéos d&apos;une chaîne</span>
              <span className="rounded-md bg-white/5 px-2 py-1">Vues</span>
            </div>
            <div className="relative mt-8 flex h-64 items-end gap-2 sm:gap-3">
              <div className="absolute inset-x-0 bottom-[36%] border-t border-dashed border-white/25">
                <span className="absolute -top-6 right-0 text-[11px] text-white/45">médiane de la chaîne</span>
              </div>
              {bars.map((h, i) => {
                const hot = h === 100;
                return (
                  <div key={i} className="relative flex h-full flex-1 items-end">
                    {hot && (
                      <span className="lp-float absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gradient-to-r from-rose-500 to-orange-400 px-2 py-1 text-xs font-bold shadow-lg shadow-orange-500/40">
                        ×24 outlier
                      </span>
                    )}
                    <div
                      className={cn(
                        "lp-bar w-full rounded-t-md",
                        hot ? "bg-gradient-to-t from-rose-600 to-orange-300 shadow-[0_0_40px_rgba(251,146,60,0.45)]" : "bg-white/[0.12]"
                      )}
                      style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }}
                    />
                  </div>
                );
              })}
            </div>
          </SpotlightCard>
        </Reveal>
      </div>
    </section>
  );
}

// --- FEATURES (BENTO) ---

function Features({ videos }: { videos: LandingVideo[] }) {
  const thumbs = videos.slice(0, 4);

  return (
    <section id="fonctionnalites" className="scroll-mt-24 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          icon={Sparkles}
          eyebrow="Fonctionnalités"
          title="Tout ce qu'il faut pour trouver votre prochaine idée."
          subtitle="Une seule app pour la recherche, l'analyse des concurrents et l'emballage de vos vidéos."
        />

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {/* Outliers */}
          <Reveal className="md:col-span-2">
            <SpotlightCard className="h-full p-7">
              <FeatureText icon={Flame} title="Explorateur d'outliers" text="Des milliers de vidéos classées par score d'outlier. Filtrez par format, durée, taille de chaîne, âge de la chaîne et date." />
              <div className="mt-7 space-y-2">
                {videos.slice(0, 3).map((v, i) => (
                  <div key={v.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 pr-3" style={{ opacity: 1 - i * 0.22 }}>
                    <img src={v.thumbnail} alt="" loading="lazy" className="aspect-video w-24 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white/85">{v.title}</p>
                      <p className="text-xs text-white/40">{v.channelTitle} · {formatCompact(v.channelSubscribers)} abonnés</p>
                    </div>
                    <span className="lp-gradient-text text-lg font-bold">{formatMultiplier(v.outlierMultiplier)}</span>
                  </div>
                ))}
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Niche finder */}
          <Reveal delay={80}>
            <SpotlightCard className="h-full p-7">
              <FeatureText icon={Radar} title="Niche Finder" text="Les niches qui montent, avec un score d'opportunité, avant qu'elles soient saturées." />
              <div className="mt-8 flex items-center justify-center">
                <div className="relative size-36">
                  <svg viewBox="0 0 120 120" className="size-full -rotate-90">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke="url(#lp-gauge)" strokeWidth="10" strokeLinecap="round" strokeDasharray="314" className="lp-gauge" />
                    <defs>
                      <linearGradient id="lp-gauge" x1="0" x2="1">
                        <stop offset="0%" stopColor="#f43f5e" />
                        <stop offset="100%" stopColor="#fb923c" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-semibold">87</span>
                    <span className="text-[10px] uppercase tracking-wider text-white/40">opportunité</span>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Channel trends */}
          <Reveal delay={0}>
            <SpotlightCard className="h-full p-7">
              <FeatureText icon={TrendingUp} title="Channel Trends" text="Les chaînes qui décollent en ce moment, classées par vitesse de croissance." />
              <svg viewBox="0 0 200 80" className="mt-8 w-full overflow-visible">
                <defs>
                  <linearGradient id="lp-spark" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 70 C30 68 45 64 70 60 S110 52 130 40 S170 12 200 6 L200 80 L0 80Z" fill="url(#lp-spark)" />
                <path d="M0 70 C30 68 45 64 70 60 S110 52 130 40 S170 12 200 6" fill="none" stroke="#fb923c" strokeWidth="2.5" className="lp-draw" />
                <circle cx="200" cy="6" r="4" fill="#fb923c" className="lp-pulse" />
              </svg>
            </SpotlightCard>
          </Reveal>

          {/* Thumbnails */}
          <Reveal delay={80}>
            <SpotlightCard className="h-full p-7">
              <FeatureText icon={ImageIcon} title="Thumbnail Intelligence" text="Décodez les miniatures qui font cliquer dans votre niche et comparez-les côte à côte." />
              <div className="mt-7 grid grid-cols-2 gap-2">
                {thumbs.map((v, i) => (
                  <div key={v.id} className="relative overflow-hidden rounded-lg ring-1 ring-white/10">
                    <img src={v.thumbnail} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                    <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[9px] text-white/80">
                      {["Visage", "Texte fort", "Contraste", "Avant/après"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Title lab */}
          <Reveal delay={160}>
            <SpotlightCard className="h-full p-7">
              <FeatureText icon={Type} title="Title Lab" text="Les structures de titres qui reviennent dans les vidéos qui explosent, prêtes à adapter." />
              <div className="mt-7 space-y-2 text-sm">
                {[
                  ["L'ascension et la chute de ", "[marque]"],
                  ["J'ai testé ", "[X]", " pendant 30 jours"],
                  ["Pourquoi personne ne parle de ", "[sujet]"],
                ].map((parts, i) => (
                  <p key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-white/70">
                    {parts.map((p, j) =>
                      p.startsWith("[") ? (
                        <span key={j} className="rounded bg-orange-400/15 px-1 text-orange-200">{p}</span>
                      ) : (
                        <span key={j}>{p}</span>
                      )
                    )}
                  </p>
                ))}
              </div>
            </SpotlightCard>
          </Reveal>

          {/* AI assistant */}
          <Reveal className="md:col-span-2">
            <SpotlightCard className="h-full p-7">
              <FeatureText icon={Bot} title="Assistant IA branché sur les données" text="Posez vos questions sur votre niche. L'assistant répond à partir des vidéos et des chaînes indexées, pas de suppositions." />
              <div className="mt-7 space-y-3">
                <div className="ml-auto w-fit max-w-md rounded-2xl rounded-br-md bg-white/10 px-4 py-2.5 text-sm">
                  Donne-moi 3 idées de vidéos qui marchent en ce moment dans le true crime.
                </div>
                <div className="flex max-w-lg gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-400">
                    <Sparkles className="size-3.5" />
                  </span>
                  <div className="rounded-2xl rounded-tl-md border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/75">
                    Les formats « affaire non résolue + iceberg » sortent fort ce mois-ci. Trois angles à tester :
                    <span className="mt-2 block text-white/55">1. L&apos;iceberg des affaires jamais résolues de votre région<br />2. La chronologie minute par minute d&apos;une disparition<br />3. Ce que la police n&apos;a jamais dit sur…</span>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Sponsors */}
          <Reveal delay={80}>
            <SpotlightCard className="h-full p-7">
              <FeatureText icon={Wallet} title="Sponsors & revenus" text="Qui sponsorise votre niche, et combien une chaîne peut gagner avec la pub." />
              <div className="mt-7 flex flex-wrap gap-2">
                {["Tech", "Apps", "VPN", "Formation", "Finance", "Jeux"].map((b) => (
                  <span key={b} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/60">{b}</span>
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[11px] text-white/40">Revenus pub estimés / mois</p>
                <p className="mt-1 text-xl font-semibold">1,2 k€ – 3,4 k€</p>
              </div>
            </SpotlightCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FeatureText({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div>
      <span className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
        <Icon className="size-4 text-orange-300" />
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-white/50">{text}</p>
    </div>
  );
}

// --- NICHE EXPLORER (LIVE DATA) ---

function NicheExplorer({ niches }: { niches: LandingPageProps["niches"] }) {
  const [active, setActive] = useState(0);
  if (niches.length === 0) return null;
  const current = niches[Math.min(active, niches.length - 1)];

  return (
    <section id="demo" className="scroll-mt-24 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          icon={BarChart3}
          eyebrow="Démo en direct"
          title="Choisissez une niche. Voyez ce qui explose."
          subtitle="Ces vidéos viennent directement de l'index d'Outlr. Rien n'est mis en scène."
        />

        <Reveal className="mt-10 flex justify-center">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1">
            {niches.map((n, i) => (
              <button
                key={n.name}
                onClick={() => setActive(i)}
                className={cn(
                  "shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                  i === active ? "bg-white text-black shadow-lg" : "text-white/55 hover:text-white"
                )}
              >
                {n.name}
              </button>
            ))}
          </div>
        </Reveal>

        <div key={current.name} className="lp-swap mt-10 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {current.videos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>

        <Reveal className="mt-12 flex justify-center">
          <Link href="/login" className="group inline-flex items-center gap-2 text-sm font-medium text-orange-300 hover:text-orange-200">
            Explorer toutes les niches <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

// --- METHOD ---

function Method() {
  const steps = [
    {
      title: "Ajoutez votre chaîne",
      text: "Collez le nom ou le lien de votre chaîne. Outlr trouve vos concurrents directs et les créateurs proches de vous.",
    },
    {
      title: "Outlr cartographie votre niche",
      text: "Les vidéos qui surperforment, les chaînes qui montent et les formats qui reviennent sont analysés pour vous.",
    },
    {
      title: "Recevez vos prochaines idées",
      text: "Votre accueil se remplit de sujets, titres et miniatures qui ont déjà prouvé qu'ils marchent.",
    },
  ];

  return (
    <section id="methode" className="scroll-mt-24 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader icon={Compass} eyebrow="Méthode" title="De zéro idée à un plan de vidéos, en trois étapes." />
        <div className="relative mt-16 grid gap-6 md:grid-cols-3">
          <div aria-hidden className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:block" />
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 120} className="relative">
              <span className="relative z-10 flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-[#0d0d14] text-sm font-semibold shadow-[0_0_30px_rgba(251,146,60,0.15)]">
                <span className="lp-gradient-text">0{i + 1}</span>
              </span>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-white/50">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- COMPARISON ---

function Comparison() {
  const rows = [
    ["Point de départ", "Volume de recherche", "Vues réelles des vidéos"],
    ["Ce que vous mesurez", "Ce que les gens tapent", "Ce que les gens regardent"],
    ["Petites chaînes", "Invisibles", "Mises en avant si elles explosent"],
    ["Miniatures et titres", "Hors sujet", "Analysés et comparés"],
    ["Fraîcheur", "Tendances déjà saturées", "Signaux récents"],
  ];

  return (
    <section className="px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <SectionHeader icon={Search} eyebrow="La différence" title="Arrêtez de deviner avec des mots-clés." />
        <Reveal className="mt-12 overflow-hidden rounded-3xl border border-white/[0.08]">
          <div className="grid grid-cols-[1.1fr_1fr_1fr] bg-white/[0.03] text-xs font-medium uppercase tracking-wider text-white/40 sm:text-sm sm:normal-case sm:tracking-normal">
            <div className="p-4 sm:p-5" />
            <div className="p-4 sm:p-5">Outils SEO classiques</div>
            <div className="bg-gradient-to-b from-orange-500/10 to-transparent p-4 text-white sm:p-5">Outlr</div>
          </div>
          {rows.map(([label, them, us]) => (
            <div key={label} className="grid grid-cols-[1.1fr_1fr_1fr] border-t border-white/[0.06] text-sm">
              <div className="p-4 text-white/70 sm:p-5">{label}</div>
              <div className="flex items-start gap-2 p-4 text-white/40 sm:p-5">
                <X className="mt-0.5 size-4 shrink-0 text-white/25" /> {them}
              </div>
              <div className="flex items-start gap-2 bg-orange-500/[0.04] p-4 text-white/85 sm:p-5">
                <Check className="mt-0.5 size-4 shrink-0 text-orange-400" /> {us}
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

// --- FAQ ---

function Faq() {
  const items = [
    {
      q: "C'est quoi exactement un outlier ?",
      a: "Une vidéo qui fait beaucoup plus de vues que la médiane de sa chaîne. Un score de ×20 veut dire 20 fois plus de vues qu'une vidéo habituelle de cette chaîne.",
    },
    {
      q: "D'où viennent les données ?",
      a: "Des données publiques de YouTube : vues, dates, abonnés et historique des chaînes. Outlr les collecte en continu et calcule les scores lui-même.",
    },
    {
      q: "Faut-il connecter mon compte YouTube ?",
      a: "Non. Il suffit du nom ou du lien de votre chaîne. Outlr n'a jamais accès à votre compte.",
    },
    {
      q: "Ça marche pour une petite chaîne ou une chaîne faceless ?",
      a: "Oui, c'est même là que ça marche le mieux. Les scores comparent chaque vidéo à sa propre chaîne, donc les petites chaînes qui explosent ressortent autant que les grosses.",
    },
    {
      q: "Quelles langues et quelles niches ?",
      a: "Toutes. L'interface est en français et l'index couvre des vidéos de toutes les langues et de tous les sujets.",
    },
  ];
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <SectionHeader icon={Sparkles} eyebrow="FAQ" title="Questions fréquentes" />
        <div className="mt-12 divide-y divide-white/[0.08] rounded-3xl border border-white/[0.08] bg-white/[0.02]">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-medium"
                >
                  {item.q}
                  <ChevronDown className={cn("size-4 shrink-0 text-white/40 transition-transform duration-300", isOpen && "rotate-180")} />
                </button>
                <div className={cn("grid transition-all duration-300 ease-out", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                  <p className="overflow-hidden px-6 text-white/55">
                    <span className="block pb-5">{item.a}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// --- FINAL CTA ---

function FinalCta() {
  return (
    <section className="px-4 py-24">
      <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 px-6 py-20 text-center">
        <div aria-hidden className="lp-aurora absolute left-[calc(50%-25rem)] top-[calc(50%-15rem)] h-[30rem] w-[50rem] rounded-full opacity-70" />
        <div aria-hidden className="lp-grid absolute inset-0 opacity-60" />
        <div className="relative">
          <h2 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">
            Votre prochaine vidéo virale existe déjà.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/60">
            Quelqu&apos;un l&apos;a juste faite avant vous, dans une autre niche ou une autre langue. Outlr vous la montre.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 font-semibold text-black transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              Créer mon compte <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#demo" className="rounded-2xl border border-white/15 px-6 py-3.5 font-medium text-white/80 transition-colors hover:bg-white/5">
              Voir la démo
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// --- FOOTER ---

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-4 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <Logo />
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/45">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-white">{l.label}</a>
          ))}
          <Link href="/login" className="hover:text-white">Se connecter</Link>
        </div>
        <p className="text-sm text-white/30">© {new Date().getFullYear()} Outlr</p>
      </div>
    </footer>
  );
}

// --- SHARED ---

function SectionEyebrow({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-white/60">
      <Icon className="size-3.5 text-orange-300" /> {children}
    </span>
  );
}

function SectionHeader({
  icon,
  eyebrow,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Reveal className="mx-auto max-w-3xl text-center">
      <SectionEyebrow icon={icon}>{eyebrow}</SectionEyebrow>
      <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{title}</h2>
      {subtitle && <p className="mx-auto mt-4 max-w-2xl text-lg text-white/50">{subtitle}</p>}
    </Reveal>
  );
}
