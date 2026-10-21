"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Flame,
  Image as ImageIcon,
  Play,
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
  formatNumber,
  formatMultiplier,
  type LandingVideo,
} from "./landing-parts";

export type { LandingVideo };

export interface LandingCreator {
  name: string;
  avatar: string;
  subscribers: number;
}

interface LandingPageProps {
  videos: LandingVideo[];
  heroVideos: LandingVideo[];
  creators: LandingCreator[];
  niches: { name: string; videos: LandingVideo[] }[];
  stats: { videos: number; channels: number; topMultiplier: number };
}

const NAV_LINKS = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#demo", label: "Démo" },
  { href: "#methode", label: "Méthode" },
  { href: "#faq", label: "FAQ" },
];

const SEARCH_EXAMPLES = [
  "Les ados qui ont piraté la CIA",
  "L'affaire que personne n'a pu oublier",
  "Pourquoi les films ne ressemblent plus à rien",
  "L'iceberg le plus sombre d'internet",
  "Le tueur le plus intelligent d'Amérique",
];

export function LandingPage({ videos, heroVideos, creators, niches, stats }: LandingPageProps) {
  return (
    <div className="lp-root relative min-h-screen overflow-x-clip bg-white text-slate-900 selection:bg-orange-200">
      <Navbar />
      <Hero videos={heroVideos} creators={creators} stats={stats} />
      <ProductPreview videos={videos.slice(0, 6)} />
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
      <span className="flex size-8 items-center justify-center rounded-xl bg-slate-950 p-1.5 shadow-sm ring-1 ring-white/10">
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
    <header className="fixed inset-x-0 top-0 z-50 text-white">
      {/* Announcement bar */}
      <a
        href="#demo"
        className="flex h-8 items-center justify-center gap-3 bg-gradient-to-r from-rose-500 to-orange-500 px-4 text-[11px] font-semibold uppercase tracking-wide text-white"
      >
        <span className="truncate">Nouveau : la démo en direct de l&apos;explorateur de niches</span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 normal-case ring-1 ring-white/40">
          Voir <ChevronRight className="size-3" />
        </span>
      </a>

      <nav
        className={cn(
          "transition-all duration-300",
          scrolled ? "border-b border-white/10 bg-[#0a0a0c]/80 backdrop-blur-xl" : "border-b border-transparent bg-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Logo />
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm text-white/65 transition-colors hover:text-white">
                {l.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm text-white/65 transition-colors hover:text-white sm:block">
              Se connecter
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300 transition-colors hover:bg-orange-500/20"
            >
              Commencer
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

// --- HERO ---

function Hero({
  videos,
  creators,
  stats,
}: {
  videos: LandingVideo[];
  creators: LandingCreator[];
  stats: LandingPageProps["stats"];
}) {
  return (
    <section className="relative overflow-hidden bg-[#0a0a0c] px-4 pb-52 pt-36 text-white sm:pt-40">
      {/* Glow rising from the bottom, like a stage light behind the wall */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[44rem] bg-[radial-gradient(ellipse_55%_60%_at_50%_100%,rgba(249,115,22,0.28),rgba(244,63,94,0.08)_45%,transparent_75%)]" />
      {/* Decorative outlines framing the wall */}
      <div aria-hidden className="pointer-events-none absolute left-[calc(50%-36rem)] top-[23rem] hidden h-[28rem] w-[36rem] rounded-tl-[3rem] border-l border-t border-white/10 lg:block" />
      <div aria-hidden className="pointer-events-none absolute left-[calc(50%-48rem)] top-[34rem] hidden h-[20rem] w-[60rem] rounded-tl-[3rem] border-l border-t border-white/[0.06] lg:block" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-white/75">
            Plus de <strong className="font-semibold text-orange-400"><CountUp value={stats.videos} /></strong> outliers indexés
          </span>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
            Le <span className="lp-gradient-text">raccourci</span>
            <br />
            <span className="sm:whitespace-nowrap">vers des millions de vues</span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-4 text-sm font-medium text-white/60 sm:text-base">
            Des vidéos ignorées aux vidéos virales, grâce aux outliers de votre niche
          </p>
        </Reveal>
      </div>

      {/* Prompt box overlapping the first row of thumbnails */}
      <div className="relative mt-8">
        <ThumbnailWall videos={videos} />

        <Reveal delay={240} className="relative z-10 mx-auto w-full max-w-md">
          <Link href="/login" className="group relative block">
            <div className="h-28 rounded-2xl border border-white/10 bg-[#141417]/95 p-4 text-left text-sm text-white/80 shadow-2xl shadow-black/60 backdrop-blur">
              <Typewriter words={SEARCH_EXAMPLES} />
            </div>
            <span className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_0_34px_rgba(249,115,22,0.6)] ring-4 ring-[#0a0a0c] transition-transform group-hover:scale-105">
              <Sparkles className="size-4" /> Trouver mes premiers outliers
            </span>
          </Link>
        </Reveal>

        <Reveal delay={300} className="relative z-10 mt-9 flex justify-center">
          <a href="#demo" className="group inline-flex items-center gap-2 rounded-full bg-[#0a0a0c]/80 py-1 pl-1 pr-3 text-sm font-medium text-white/80 ring-1 ring-white/10 backdrop-blur hover:text-white">
            <span className="flex size-7 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 transition-transform group-hover:scale-110">
              <Play className="size-3 fill-white text-white" />
            </span>
            Voir la démo <span className="text-xs text-white/40">en direct</span>
          </a>
        </Reveal>

        {/* Leaves room for the second row of thumbnails under the button */}
        <div aria-hidden className="h-44 sm:h-48" />
      </div>

      <Reveal delay={400} className="relative z-10 mx-auto mt-10 flex max-w-2xl flex-wrap items-start justify-center gap-x-20 gap-y-8 text-center">
        {[
          { value: <CountUp value={stats.videos} />, label: "Vidéos virales indexées" },
          { value: <CountUp value={stats.channels} />, label: "Chaînes analysées" },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-6xl font-bold tracking-tight sm:text-7xl">
              {s.value}
              <sup className="lp-gradient-text ml-0.5 align-super text-4xl">+</sup>
            </p>
            <p className="mt-1 text-sm font-medium text-white/55">{s.label}</p>
          </div>
        ))}
      </Reveal>

      {creators.length >= 4 && (
        <Reveal delay={480} className="relative z-10 mt-12">
          <p className="text-center text-sm font-medium text-white/70">Quelques chaînes dont Outlr a repéré les outliers :</p>
          <div className="lp-marquee-mask mx-auto mt-5 flex max-w-4xl overflow-hidden">
            <div className="lp-marquee flex shrink-0 gap-8 pr-8" style={{ animationDuration: "50s" }}>
              {[...creators, ...creators].map((c, i) => (
                <div key={`${c.name}-${i}`} aria-hidden={i >= creators.length} className="flex shrink-0 items-center gap-2.5">
                  <img src={c.avatar} alt="" loading="lazy" className="size-9 rounded-full ring-1 ring-white/15" />
                  <div className="text-left leading-tight">
                    <p className="flex items-center gap-1 text-sm font-semibold capitalize">
                      {c.name} <BadgeCheck className="size-3.5 text-white/40" />
                    </p>
                    <p className="text-xs text-white/50">{formatCompact(c.subscribers)} abonnés</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}
    </section>
  );
}

/** Rounds down to three significant digits, e.g. 15 530 204 → 15 500 000. */
function roundViews(n: number) {
  const step = 10 ** Math.max(0, Math.floor(Math.log10(Math.max(n, 1))) - 2);
  return Math.floor(n / step) * step;
}

/** Two rows of real outlier thumbnails drifting behind the prompt box. */
function ThumbnailWall({ videos }: { videos: LandingVideo[] }) {
  if (videos.length < 8) return null;
  const half = Math.ceil(videos.length / 2);
  const rows = [videos.slice(0, half), videos.slice(half)];

  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-10 flex w-screen -translate-x-1/2 flex-col gap-4">
      {rows.map((row, r) => (
        <div key={r} className="lp-marquee-mask flex overflow-hidden">
          <div
            className={cn("lp-marquee flex shrink-0 gap-3 pr-3", r === 1 && "lp-marquee-reverse")}
            style={{ animationDuration: `${r === 0 ? 90 : 110}s` }}
          >
            {[...row, ...row].map((v, i) => (
              <div key={`${v.id}-${i}`} className="w-44 shrink-0 rounded-xl border border-white/[0.07] bg-[#151518] p-1 sm:w-48">
                <img src={v.thumbnail} alt="" loading="lazy" className="aspect-video w-full rounded-lg object-cover" />
                <p className="mt-1.5 line-clamp-2 px-1 text-[11px] font-semibold leading-snug text-white/85">{v.title}</p>
                <p className="px-1 pb-1 pt-0.5 text-[10px] text-white/40">{formatNumber(roundViews(v.viewCount))}+ vues</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* Dim the cards around the prompt box so it reads first */}
      <div className="lp-wall-shade absolute inset-0" />
    </div>
  );
}

// --- PRODUCT PREVIEW ---

function ProductPreview({ videos }: { videos: LandingVideo[] }) {
  const frameRef = useRef<HTMLDivElement>(null);

  // The frame starts tilted and flattens as it scrolls into view.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onScroll = () => {
      const top = el.parentElement!.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, 1 - top / (window.innerHeight * 0.85)));
      el.style.transform = `perspective(1600px) rotateX(${16 * (1 - p)}deg) scale(${0.93 + 0.07 * p})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="relative z-10 -mt-40 px-4 pb-24">
      <div className="relative mx-auto max-w-6xl">
        <div aria-hidden className="absolute -inset-x-10 -top-10 bottom-10 rounded-[3rem] bg-gradient-to-b from-orange-500/25 via-rose-500/10 to-transparent blur-3xl" />
        <div ref={frameRef} className="relative origin-top transition-transform duration-150 ease-out will-change-transform">
          <AppFrame videos={videos} />
        </div>
      </div>
    </section>
  );
}

function AppFrame({ videos }: { videos: LandingVideo[] }) {
  const sideIcons = [LayoutGrid, Flame, TrendingUp, Compass, ImageIcon, Type, Wallet];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_40px_100px_-30px_rgba(15,23,42,0.25)]">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className="size-2.5 rounded-full bg-slate-200" />
        <span className="size-2.5 rounded-full bg-slate-200" />
        <span className="size-2.5 rounded-full bg-slate-200" />
        <span className="mx-auto rounded-md bg-slate-100 px-16 py-1 text-[11px] text-slate-400">outlr.app/outliers</span>
      </div>

      <div className="flex">
        <aside className="hidden w-14 shrink-0 flex-col items-center gap-3 border-r border-slate-100 py-5 sm:flex">
          {sideIcons.map((Icon, i) => (
            <span key={i} className={cn("flex size-8 items-center justify-center rounded-lg", i === 1 ? "bg-slate-900 text-white" : "text-slate-400")}>
              <Icon className="size-4" />
            </span>
          ))}
        </aside>

        <div className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Outliers</p>
              <p className="text-xs text-slate-500">Vidéos qui surperforment leur chaîne</p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {["Long format", "Outlier ≥ 10×", "Toutes chaînes", "Tri : score viral"].map((f, i) => (
                <span
                  key={f}
                  className={cn(
                    "rounded-lg border px-2.5 py-1",
                    i === 1 ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600"
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
          <p className="mt-5 text-lg text-slate-600">
            Un outlier, c&apos;est une vidéo qui fait bien plus de vues que la médiane de sa propre chaîne. Quand une
            chaîne de 6 000 abonnés sort une vidéo à 500 000 vues, ce n&apos;est pas la taille de la chaîne qui a joué.
            C&apos;est le sujet, le titre et la miniature. C&apos;est exactement ça que vous voulez reproduire.
          </p>
          <ul className="mt-8 space-y-3 text-slate-700">
            {[
              "Comparé à la chaîne elle-même, pas à tout YouTube",
              "Les petites chaînes ressortent autant que les géants",
              "Des signaux frais, pas des tendances déjà saturées",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-100">
                  <Check className="size-3 text-orange-600" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120}>
          <SpotlightCard className="p-6 sm:p-8">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>10 dernières vidéos d&apos;une chaîne</span>
              <span className="rounded-md bg-slate-100 px-2 py-1">Vues</span>
            </div>
            <div className="relative mt-8 flex h-64 items-end gap-2 sm:gap-3">
              <div className="absolute inset-x-0 bottom-[36%] border-t border-dashed border-slate-300">
                <span className="absolute -top-6 right-0 text-[11px] text-slate-500">médiane de la chaîne</span>
              </div>
              {bars.map((h, i) => {
                const hot = h === 100;
                return (
                  <div key={i} className="relative flex h-full flex-1 items-end">
                    {hot && (
                      <span className="lp-float absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gradient-to-r from-rose-500 to-orange-400 px-2 py-1 text-xs font-bold text-white shadow-lg shadow-orange-500/30">
                        ×24 outlier
                      </span>
                    )}
                    <div
                      className={cn(
                        "lp-bar w-full rounded-t-md",
                        hot ? "bg-gradient-to-t from-rose-500 to-orange-300 shadow-[0_0_40px_rgba(251,146,60,0.35)]" : "bg-slate-200"
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
    <section id="fonctionnalites" className="scroll-mt-24 bg-slate-50/70 px-4 py-24">
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
                  <div key={v.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 pr-3" style={{ opacity: 1 - i * 0.22 }}>
                    <img src={v.thumbnail} alt="" loading="lazy" className="aspect-video w-24 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-800">{v.title}</p>
                      <p className="text-xs text-slate-500">{v.channelTitle} · {formatCompact(v.channelSubscribers)} abonnés</p>
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
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="10" />
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
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">opportunité</span>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Channel trends */}
          <Reveal>
            <SpotlightCard className="h-full p-7">
              <FeatureText icon={TrendingUp} title="Channel Trends" text="Les chaînes qui décollent en ce moment, classées par vitesse de croissance." />
              <svg viewBox="0 0 200 80" className="mt-8 w-full overflow-visible">
                <defs>
                  <linearGradient id="lp-spark" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 70 C30 68 45 64 70 60 S110 52 130 40 S170 12 200 6 L200 80 L0 80Z" fill="url(#lp-spark)" />
                <path d="M0 70 C30 68 45 64 70 60 S110 52 130 40 S170 12 200 6" fill="none" stroke="#f97316" strokeWidth="2.5" className="lp-draw" />
                <circle cx="200" cy="6" r="4" fill="#f97316" className="lp-pulse" />
              </svg>
            </SpotlightCard>
          </Reveal>

          {/* Thumbnails */}
          <Reveal delay={80}>
            <SpotlightCard className="h-full p-7">
              <FeatureText icon={ImageIcon} title="Thumbnail Intelligence" text="Décodez les miniatures qui font cliquer dans votre niche et comparez-les côte à côte." />
              <div className="mt-7 grid grid-cols-2 gap-2">
                {thumbs.map((v, i) => (
                  <div key={v.id} className="relative overflow-hidden rounded-lg ring-1 ring-slate-200">
                    <img src={v.thumbnail} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                    <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1 text-[9px] font-medium text-slate-700">
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
                  <p key={i} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">
                    {parts.map((p, j) =>
                      p.startsWith("[") ? (
                        <span key={j} className="rounded bg-orange-100 px-1 text-orange-700">{p}</span>
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
                <div className="ml-auto w-fit max-w-md rounded-2xl rounded-br-md bg-slate-900 px-4 py-2.5 text-sm text-white">
                  Donne-moi 3 idées de vidéos qui marchent en ce moment dans le true crime.
                </div>
                <div className="flex max-w-lg gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-400 text-white">
                    <Sparkles className="size-3.5" />
                  </span>
                  <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    Les formats « affaire non résolue + iceberg » sortent fort ce mois-ci. Trois angles à tester :
                    <span className="mt-2 block text-slate-500">1. L&apos;iceberg des affaires jamais résolues de votre région<br />2. La chronologie minute par minute d&apos;une disparition<br />3. Ce que la police n&apos;a jamais dit sur…</span>
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
                  <span key={b} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">{b}</span>
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] text-slate-500">Revenus pub estimés / mois</p>
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
      <span className="flex size-9 items-center justify-center rounded-xl border border-orange-200 bg-orange-50">
        <Icon className="size-4 text-orange-600" />
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{text}</p>
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
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-1">
            {niches.map((n, i) => (
              <button
                key={n.name}
                onClick={() => setActive(i)}
                className={cn(
                  "shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                  i === active ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-900"
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
          <Link href="/login" className="group inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700">
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
    <section id="methode" className="scroll-mt-24 bg-slate-50/70 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeader icon={Compass} eyebrow="Méthode" title="De zéro idée à un plan de vidéos, en trois étapes." />
        <div className="relative mt-16 grid gap-6 md:grid-cols-3">
          <div aria-hidden className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent md:block" />
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 120} className="relative">
              <span className="relative z-10 flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold shadow-sm">
                <span className="lp-gradient-text">0{i + 1}</span>
              </span>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-slate-600">{s.text}</p>
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
        <Reveal className="mt-12 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.1fr_1fr_1fr] bg-slate-50 text-xs font-medium uppercase tracking-wider text-slate-500 sm:text-sm sm:normal-case sm:tracking-normal">
            <div className="p-4 sm:p-5" />
            <div className="p-4 sm:p-5">Outils SEO classiques</div>
            <div className="bg-orange-50 p-4 text-slate-900 sm:p-5">Outlr</div>
          </div>
          {rows.map(([label, them, us]) => (
            <div key={label} className="grid grid-cols-[1.1fr_1fr_1fr] border-t border-slate-100 text-sm">
              <div className="p-4 font-medium text-slate-700 sm:p-5">{label}</div>
              <div className="flex items-start gap-2 p-4 text-slate-400 sm:p-5">
                <X className="mt-0.5 size-4 shrink-0 text-slate-300" /> {them}
              </div>
              <div className="flex items-start gap-2 bg-orange-50/50 p-4 text-slate-800 sm:p-5">
                <Check className="mt-0.5 size-4 shrink-0 text-orange-500" /> {us}
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
    <section id="faq" className="scroll-mt-24 bg-slate-50/70 px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <SectionHeader icon={Sparkles} eyebrow="FAQ" title="Questions fréquentes" />
        <div className="mt-12 divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white shadow-sm">
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
                  <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
                </button>
                <div className={cn("grid transition-all duration-300 ease-out", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                  <p className="overflow-hidden px-6 text-slate-600">
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
      <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-20 text-center text-white">
        <div aria-hidden className="lp-aurora absolute left-[calc(50%-25rem)] top-[calc(50%-15rem)] h-[30rem] w-[50rem] rounded-full opacity-90" />
        <div className="relative">
          <h2 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">
            Votre prochaine vidéo virale existe déjà.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/65">
            Quelqu&apos;un l&apos;a juste faite avant vous, dans une autre niche ou une autre langue. Outlr vous la montre.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 font-semibold text-slate-900 transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              Créer mon compte <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#demo" className="rounded-2xl border border-white/20 px-6 py-3.5 font-medium text-white/85 transition-colors hover:bg-white/10">
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
    <footer className="border-t border-slate-200 px-4 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <Logo />
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-slate-900">{l.label}</a>
          ))}
          <Link href="/login" className="hover:text-slate-900">Se connecter</Link>
        </div>
        <p className="text-sm text-slate-400">© {new Date().getFullYear()} Outlr</p>
      </div>
    </footer>
  );
}

// --- SHARED ---

function SectionEyebrow({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
      <Icon className="size-3.5 text-orange-500" /> {children}
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
      {subtitle && <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">{subtitle}</p>}
    </Reveal>
  );
}
