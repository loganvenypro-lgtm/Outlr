"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Compass,
  Dices,
  Flame,
  Hourglass,
  Image as ImageIcon,
  Play,
  LayoutGrid,
  Radar,
  Search,
  Sparkles,
  Telescope,
  Target,
  TrendingUp,
  Type,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ChannelAvatar,
  CountUp,
  Reveal,
  SpotlightCard,
  Typewriter,
  VideoCard,
  formatCompact,
  formatNumber,
  formatMultiplier,
  timeAgo,
  type LandingVideo,
} from "./landing-parts";

export type { LandingVideo };

export interface LandingCreator {
  name: string;
  avatar: string;
  subscribers: number;
}

export interface LandingStats {
  videos: number;
  channels: number;
  views: number;
  /** Relevant videos at ×10 or more their channel's median. */
  bigOutliers: number;
  /** Videos published in the last 7 days. */
  freshWeek: number;
  /** Last successful scan, ISO. */
  updatedAt: string | null;
}

interface LandingPageProps {
  videos: LandingVideo[];
  heroVideos: LandingVideo[];
  creators: LandingCreator[];
  niches: { name: string; videos: LandingVideo[] }[];
  /** Recent small-channel breakouts, for the proof section. */
  breakouts: LandingVideo[];
  stats: LandingStats;
}

const NAV_LINKS = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#preuves", label: "Preuves" },
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

export function LandingPage({ videos, heroVideos, creators, niches, breakouts, stats }: LandingPageProps) {
  return (
    <div className="lp-root relative min-h-screen overflow-x-clip bg-white text-slate-900 selection:bg-orange-200">
      <Navbar freshWeek={stats.freshWeek} />
      <Hero videos={heroVideos} creators={creators} stats={stats} />
      <ProductPreview videos={videos.slice(0, 6)} />
      <Problem />
      <OutlierExplainer />
      <Features videos={videos} />
      <Proof videos={breakouts} />
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
        <img src="/outlr-mark.png" alt="" className="size-full object-contain" />
      </span>
      <span className="text-lg font-bold tracking-tight">Outlr</span>
    </Link>
  );
}

// --- NAVBAR ---

function Navbar({ freshWeek }: { freshWeek: number }) {
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
        <span className="truncate">
          {freshWeek >= 1_000 ? (
            <>
              +{formatNumber(freshWeek)} <span className="hidden sm:inline">nouvelles </span>vidéos analysées en 7 jours
            </>
          ) : (
            "Nouveau : la démo en direct de l'explorateur de niches"
          )}
        </span>
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
              className="lp-shine relative rounded-xl border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300 transition-colors hover:bg-orange-500/20"
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

/** Rounds down to two significant digits in k / M / Md, so the "+" stays true (4 658 → 4,6 k). */
function compactStat(n: number) {
  const units = [
    [1e9, "Md"],
    [1e6, "M"],
    [1e3, "k"],
  ] as const;
  const [div, unit] = units.find(([d]) => n >= d) ?? [1, ""];
  const scaled = n / div;
  const step = 10 ** (Math.floor(Math.log10(Math.max(scaled, 1))) - 1);
  return { value: Math.floor(scaled / step) * step, decimals: step < 1 ? 1 : 0, unit };
}

function updatedAgo(iso: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 48 * 60) return `il y a ${Math.round(minutes / 60)} h`;
  return timeAgo(iso);
}

function Hero({
  videos,
  creators,
  stats,
}: {
  videos: LandingVideo[];
  creators: LandingCreator[];
  stats: LandingStats;
}) {
  const statItems = [
    { ...compactStat(stats.videos), label: "Vidéos analysées" },
    { ...compactStat(stats.bigOutliers), label: "Outliers à ×10 ou plus" },
    { ...compactStat(stats.views), label: "Vues passées au crible" },
  ];

  return (
    <section className="relative overflow-hidden bg-[#0a0a0c] px-4 pb-52 pt-32 text-white sm:pt-40">
      {/* Halo centred on the search box, then a warmer glow rising from the bottom behind the wall */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-40 h-[42rem] bg-[radial-gradient(ellipse_42%_45%_at_50%_50%,rgba(249,115,22,0.16),rgba(244,63,94,0.05)_55%,transparent_75%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[44rem] bg-[radial-gradient(ellipse_55%_60%_at_50%_100%,rgba(249,115,22,0.28),rgba(244,63,94,0.08)_45%,transparent_75%)]" />
      {/* Decorative outlines framing the wall */}
      <div aria-hidden className="pointer-events-none absolute left-[calc(50%-36rem)] top-[23rem] hidden h-[28rem] w-[36rem] rounded-tl-[3rem] border-l border-t border-white/10 lg:block" />
      <div aria-hidden className="pointer-events-none absolute left-[calc(50%-48rem)] top-[34rem] hidden h-[20rem] w-[60rem] rounded-tl-[3rem] border-l border-t border-white/[0.06] lg:block" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        <Reveal>
          <TrustBadge creators={creators} stats={stats} />
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
            <span className="block text-balance">
              Les vidéos qui <span className="lp-gradient-text">explosent</span>,
            </span>
            <span className="block text-balance">repérées avant les autres</span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-sm font-medium text-white/60 sm:text-base">
            Outlr compare chaque vidéo à la médiane de sa chaîne pour révéler les outliers et les tendances de votre
            niche.
          </p>
        </Reveal>
      </div>

      {/* Search box overlapping the first row of thumbnails */}
      <div className="relative mt-9">
        <ThumbnailWall videos={videos} />

        <Reveal delay={240} className="relative z-10 mx-auto w-full max-w-xl">
          <HeroSearch />
        </Reveal>

        <Reveal delay={300} className="relative z-10 mt-10 flex justify-center">
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

      <Reveal delay={400} className="relative z-10 mx-auto mt-10 grid max-w-4xl grid-cols-3 gap-2 text-center sm:gap-8">
        {statItems.map((s) => (
          <div key={s.label}>
            <p className="whitespace-nowrap text-[1.75rem] font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              <CountUp value={s.value} decimals={s.decimals} suffix={s.unit && ` ${s.unit}`} />
              <sup className="lp-gradient-text ml-0.5 align-super text-lg sm:text-3xl lg:text-4xl">+</sup>
            </p>
            <p className="mt-1 text-[11px] font-medium leading-snug text-white/55 sm:text-sm">{s.label}</p>
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

/** Live index status and the number of channels followed, in place of a review score. */
function TrustBadge({ creators, stats }: { creators: LandingCreator[]; stats: LandingStats }) {
  const avatars = creators.slice(0, 4);

  return (
    <div className="flex flex-col items-center gap-2.5">
      {stats.updatedAt && (
        <span className="flex items-center gap-2 text-xs font-medium text-white/55">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70 motion-reduce:animate-none" />
            <span className="relative size-2 rounded-full bg-emerald-400" />
          </span>
          Index mis à jour {updatedAgo(stats.updatedAt)}
        </span>
      )}
      <span
        className={cn(
          "inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] py-1 pr-3.5 text-xs text-white/75 backdrop-blur sm:text-sm",
          avatars.length >= 3 ? "pl-1" : "pl-3.5"
        )}
      >
        {avatars.length >= 3 && (
          <span className="flex -space-x-2">
            {avatars.map((c) => (
              <img key={c.name} src={c.avatar} alt="" className="size-6 rounded-full bg-white/10 ring-2 ring-[#0a0a0c]" />
            ))}
          </span>
        )}
        <span>
          <strong className="font-semibold text-orange-400">{formatNumber(stats.channels)}</strong> chaînes
          <span className="hidden sm:inline"> YouTube</span> suivies en continu
        </span>
      </span>
    </div>
  );
}

/** A real field with rotating example topics; like every CTA on the page, it leads to sign-up. */
function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push("/login");
      }}
      className="relative"
    >
      <div className="relative rounded-2xl border border-white/10 bg-[#141417]/80 px-4 pb-8 pt-4 text-left shadow-2xl shadow-black/60 backdrop-blur-xl transition-colors focus-within:border-orange-400/40">
        <label htmlFor="lp-hero-query" className="sr-only">
          Un sujet, une niche ou le lien d&apos;une chaîne YouTube
        </label>
        <textarea
          id="lp-hero-query"
          rows={2}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Un sujet, une niche ou le lien d'une chaîne"
          className="peer block h-16 w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-transparent focus:placeholder:text-white/35"
        />
        {/* Example topics type themselves until the field is focused or filled */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-4 top-4 text-sm text-white/80 peer-focus:opacity-0 peer-[:not(:placeholder-shown)]:opacity-0"
        >
          <Typewriter words={SEARCH_EXAMPLES} />
        </span>
        <p className="flex items-center gap-1.5 text-[11px] text-white/35">
          <Search className="size-3" /> Sujet, niche ou lien de chaîne
        </p>
      </div>
      <button
        type="submit"
        className="lp-shine absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_34px_rgba(249,115,22,0.6)] ring-4 ring-[#0a0a0c] transition-all hover:scale-105 hover:shadow-[0_0_48px_rgba(249,115,22,0.8)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
      >
        <Sparkles className="size-4" /> Trouver mes premiers outliers
      </button>
    </form>
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
                <div className="relative">
                  <img src={v.thumbnail} alt="" loading="lazy" className="aspect-video w-full rounded-lg object-cover" />
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-gradient-to-r from-rose-500 to-orange-400 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md shadow-rose-500/30">
                    {formatMultiplier(v.outlierMultiplier)}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 px-1 text-[11px] font-semibold leading-snug text-white/85">{v.title}</p>
                <p className="px-1 pb-1 pt-0.5 text-[10px] text-white/40">{formatNumber(roundViews(v.viewCount))}+ vues</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* Dim the cards around the search box so it reads first, and blur them out toward the edges */}
      <div className="lp-wall-shade absolute inset-0" />
      <div className="lp-wall-edge absolute inset-y-0 left-0" />
      <div className="lp-wall-edge absolute inset-y-0 right-0 -scale-x-100" />
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

// --- PROBLEM ---

function Problem() {
  return (
    <section className="relative overflow-hidden px-4 py-24">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(ellipse_45%_60%_at_50%_0%,rgba(251,113,133,0.12),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl">
        <SectionHeader
          icon={CircleHelp}
          eyebrow="Le problème"
          title={
            <>
              Le problème n&apos;est pas <span className="lp-gradient-text">votre montage.</span>
            </>
          }
          subtitle="C'est le sujet. Choisi au feeling, trouvé trop tard, ou copié sur des chaînes qui ne jouent pas dans votre catégorie."
        />

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Reveal>
            <ProblemCard
              icon={Dices}
              title="Des sujets choisis au feeling"
              text="Une semaine de tournage misée sur une intuition, sans savoir si le sujet a déjà fait ses preuves quelque part."
            >
              <div className="space-y-2">
                {["L'histoire cachée de Nokia", "J'ai testé le jeûne pendant 7 jours", "Mon setup 2026"].map((idea, i) => (
                  <div key={idea} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <span className="truncate text-slate-700">{idea}</span>
                    <span
                      className="lp-pulse shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500"
                      style={{ animationDelay: `${i * 400}ms` }}
                    >
                      potentiel ?
                    </span>
                  </div>
                ))}
              </div>
            </ProblemCard>
          </Reveal>

          <Reveal delay={100}>
            <ProblemCard
              icon={Hourglass}
              title="Des tendances déjà épuisées"
              text="Quand un sujet arrive dans l'onglet Tendances, des centaines de chaînes l'ont déjà traité. Vous arrivez après la vague."
            >
              <svg viewBox="0 0 220 100" className="w-full overflow-visible" role="img" aria-label="Une tendance qui retombe au moment où vous publiez">
                <text x="122" y="9" textAnchor="middle" className="fill-slate-400 text-[9px]">pic de la tendance</text>
                <path
                  d="M0 92 C40 90 60 80 85 50 S112 16 122 16 S148 40 168 65 S205 88 220 90"
                  pathLength={260}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="lp-draw"
                />
                <circle cx="122" cy="16" r="3.5" fill="#94a3b8" />
                <circle cx="180" cy="75" r="5" fill="#f43f5e" className="lp-pulse" />
                <text x="180" y="62" textAnchor="middle" className="fill-rose-500 text-[9px] font-semibold">vous publiez ici</text>
              </svg>
            </ProblemCard>
          </Reveal>

          <Reveal delay={200}>
            <ProblemCard
              icon={Users}
              title="Les mauvais modèles"
              text="Une chaîne de 20 millions d'abonnés fait des vues avec n'importe quel sujet. Elle ne vous apprend rien sur ce qui marche pour une chaîne comme la vôtre."
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5">
                  <span className="size-8 shrink-0 rounded-full bg-slate-200" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-sm font-medium text-slate-700">Chaîne géante</p>
                    <p className="text-[11px] text-slate-400">20 M abonnés · vues habituelles</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-400">×1</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50/70 p-2.5">
                  <span className="size-8 shrink-0 rounded-full bg-gradient-to-br from-rose-500 to-orange-400" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-sm font-medium text-slate-800">Petite chaîne</p>
                    <p className="text-[11px] text-slate-500">8 k abonnés · un sujet qui a pris</p>
                  </div>
                  <span className="lp-gradient-text text-lg font-bold">×28</span>
                </div>
                <p className="pt-1 text-center text-[11px] text-slate-400">Exemple : c&apos;est la seconde qui vous apprend quelque chose.</p>
              </div>
            </ProblemCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ProblemCard({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <SpotlightCard className="flex h-full flex-col p-6">
      <div className="flex min-h-40 flex-col justify-center rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">{children}</div>
      <h3 className="mt-6 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Icon className="size-4 text-rose-500" /> {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p>
    </SpotlightCard>
  );
}

// --- WHY OUTLIERS ---

function OutlierExplainer() {
  // A channel whose uploads hover around its median, plus one breakout.
  const bars = [32, 41, 28, 36, 44, 30, 38, 100, 35, 40];

  return (
    <section className="px-4 py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-2">
        <Reveal>
          <SectionEyebrow icon={Telescope}>La solution</SectionEyebrow>
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
    <section id="fonctionnalites" className="relative scroll-mt-24 overflow-hidden bg-[#0a0a0c] px-4 py-28 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(ellipse_50%_55%_at_50%_0%,rgba(249,115,22,0.22),rgba(244,63,94,0.06)_50%,transparent_75%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[30rem] bg-[radial-gradient(ellipse_45%_60%_at_50%_100%,rgba(249,115,22,0.14),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl">
        <SectionHeader
          tone="dark"
          icon={Sparkles}
          eyebrow="Fonctionnalités"
          title={
            <>
              Sept outils pour une seule question&nbsp;: <span className="lp-gradient-text">quelle vidéo faire ensuite&nbsp;?</span>
            </>
          }
          subtitle="Recherche, veille concurrentielle et emballage, tout est branché sur le même index de vidéos qui surperforment."
        />

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Outliers */}
          <Reveal className="md:col-span-2">
            <SpotlightCard tone="dark" className="h-full p-7">
              <FeatureText icon={Flame} title="Explorateur d'outliers" text="Des milliers de vidéos classées par score d'outlier. Filtrez par format, durée, taille de chaîne, âge de la chaîne et date." />
              <div className="mt-7 space-y-2">
                {videos.slice(0, 3).map((v, i) => (
                  <div key={v.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2 pr-3" style={{ opacity: 1 - i * 0.22 }}>
                    <img src={v.thumbnail} alt="" loading="lazy" className="aspect-video w-24 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white/90">{v.title}</p>
                      <p className="truncate text-xs text-white/45">{v.channelTitle} · {formatCompact(v.channelSubscribers)} abonnés</p>
                    </div>
                    <span className="lp-gradient-text text-lg font-bold">{formatMultiplier(v.outlierMultiplier)}</span>
                  </div>
                ))}
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Niche finder */}
          <Reveal delay={80}>
            <SpotlightCard tone="dark" className="h-full p-7">
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
                    <span className="text-[10px] uppercase tracking-wider text-white/45">opportunité</span>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Channel trends */}
          <Reveal>
            <SpotlightCard tone="dark" className="h-full p-7">
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
            <SpotlightCard tone="dark" className="h-full p-7">
              <FeatureText icon={ImageIcon} title="Thumbnail Intelligence" text="Décodez les miniatures qui font cliquer dans votre niche et comparez-les côte à côte." />
              <div className="mt-7 grid grid-cols-2 gap-2">
                {thumbs.map((v, i) => (
                  <div key={v.id} className="relative overflow-hidden rounded-lg ring-1 ring-white/10">
                    <img src={v.thumbnail} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                    <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[9px] font-medium text-white backdrop-blur">
                      {["Visage", "Texte fort", "Contraste", "Avant/après"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Title lab */}
          <Reveal delay={160}>
            <SpotlightCard tone="dark" className="h-full p-7">
              <FeatureText icon={Type} title="Title Lab" text="Les structures de titres qui reviennent dans les vidéos qui explosent, prêtes à adapter." />
              <div className="mt-7 space-y-2 text-sm">
                {[
                  ["L'ascension et la chute de ", "[marque]"],
                  ["J'ai testé ", "[X]", " pendant 30 jours"],
                  ["Pourquoi personne ne parle de ", "[sujet]"],
                ].map((parts, i) => (
                  <p key={i} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-white/80">
                    {parts.map((p, j) =>
                      p.startsWith("[") ? (
                        <span key={j} className="rounded bg-orange-500/15 px-1 text-orange-300">{p}</span>
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
            <SpotlightCard tone="dark" className="h-full p-7">
              <FeatureText icon={Bot} title="Assistant IA branché sur les données" text="Posez vos questions sur votre niche. L'assistant répond à partir des vidéos et des chaînes indexées, pas de suppositions." />
              <div className="mt-7 space-y-3">
                <div className="ml-auto w-fit max-w-md rounded-2xl rounded-br-md bg-white px-4 py-2.5 text-sm text-slate-900">
                  Donne-moi 3 idées de vidéos qui marchent en ce moment dans le true crime.
                </div>
                <div className="flex max-w-lg gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-400 text-white">
                    <Sparkles className="size-3.5" />
                  </span>
                  <div className="rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/80">
                    Les formats « affaire non résolue + iceberg » sortent fort ce mois-ci. Trois angles à tester :
                    <span className="mt-2 block text-white/50">1. L&apos;iceberg des affaires jamais résolues de votre région<br />2. La chronologie minute par minute d&apos;une disparition<br />3. Ce que la police n&apos;a jamais dit sur…</span>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </Reveal>

          {/* Sponsors */}
          <Reveal delay={80}>
            <SpotlightCard tone="dark" className="h-full p-7">
              <FeatureText icon={Wallet} title="Sponsors & revenus" text="Qui sponsorise votre niche, et combien une chaîne peut gagner avec la pub." />
              <div className="mt-7 flex flex-wrap gap-2">
                {["Tech", "Apps", "VPN", "Formation", "Finance", "Jeux"].map((b) => (
                  <span key={b} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70">{b}</span>
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[11px] text-white/45">Revenus pub estimés / mois</p>
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
      <span className="flex size-9 items-center justify-center rounded-xl border border-orange-400/30 bg-orange-500/10 shadow-[0_0_24px_rgba(249,115,22,0.18)]">
        <Icon className="size-4 text-orange-400" />
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-white/55">{text}</p>
    </div>
  );
}

// --- PROOF (LIVE DATA) ---

function Proof({ videos }: { videos: LandingVideo[] }) {
  if (videos.length < 3) return null;

  return (
    <section id="preuves" className="relative scroll-mt-24 overflow-hidden px-4 py-24">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,rgba(249,115,22,0.10),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl">
        <SectionHeader
          icon={Target}
          eyebrow="Preuves"
          title={
            <>
              Petites chaînes, <span className="lp-gradient-text">vues énormes.</span>
            </>
          }
          subtitle="Des vidéos longues repérées par Outlr ces quatre derniers mois, sur des chaînes de moins de 100 000 abonnés. Ce n'est pas l'audience qui a joué."
        />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v, i) => (
            <Reveal key={v.id} delay={(i % 3) * 100} className="h-full">
              <BreakoutCard video={v} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 flex justify-center">
          <Link
            href="/login"
            className="lp-shine group relative inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 font-semibold text-white shadow-lg shadow-slate-950/20 transition-all hover:shadow-xl hover:shadow-orange-500/20"
          >
            Trouver les outliers de ma niche <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function BreakoutCard({ video: v }: { video: LandingVideo }) {
  const median = v.viewCount / Math.max(v.outlierMultiplier, 1);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10">
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        <img src={v.thumbnail} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-lg bg-gradient-to-r from-rose-500 to-orange-400 px-2 py-1 text-sm font-bold text-white shadow-lg shadow-rose-500/30">
          <CountUp value={Math.round(v.outlierMultiplier)} prefix="×" />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{v.title}</p>
        <div className="mt-auto space-y-2.5 pt-5">
          <ProofBar label="Médiane de la chaîne" views={median} width={Math.max(3, 100 / v.outlierMultiplier)} muted />
          <ProofBar label="Cette vidéo" views={v.viewCount} width={100} />
        </div>
        <div className="mt-5 flex items-center gap-2.5 border-t border-slate-100 pt-4">
          <ChannelAvatar src={v.channelAvatar} />
          <p className="min-w-0 truncate text-xs text-slate-500">
            <span className="font-medium text-slate-700">{v.channelTitle}</span> · {formatCompact(v.channelSubscribers)} abonnés ·{" "}
            {timeAgo(v.publishedAt)}
          </p>
        </div>
      </div>
    </article>
  );
}

function ProofBar({ label, views, width, muted = false }: { label: string; views: number; width: number; muted?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={cn("font-semibold tabular-nums", muted ? "text-slate-500" : "text-slate-900")}>{formatCompact(views)} vues</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("lp-grow-x h-full rounded-full", muted ? "bg-slate-300" : "bg-gradient-to-r from-rose-500 to-orange-400")}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

// --- NICHE EXPLORER (LIVE DATA) ---

function NicheExplorer({ niches }: { niches: LandingPageProps["niches"] }) {
  const [active, setActive] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  // The white pill slides under the active tab (positioned in the DOM, no re-render)
  useEffect(() => {
    const place = () => {
      const tab = tabsRef.current?.querySelectorAll<HTMLButtonElement>("button")[active];
      const pill = pillRef.current;
      if (!tab || !pill) return;
      pill.style.width = `${tab.offsetWidth}px`;
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.opacity = "1";
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [active, niches.length]);

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
          <div ref={tabsRef} className="relative flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <span
              ref={pillRef}
              aria-hidden
              className="absolute bottom-1 left-0 top-1 rounded-xl bg-white opacity-0 shadow-sm ring-1 ring-slate-200 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            />
            {niches.map((n, i) => (
              <button
                key={n.name}
                onClick={() => setActive(i)}
                aria-pressed={i === active}
                className={cn(
                  "relative shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300",
                  i === active ? "text-slate-900" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {n.name}
              </button>
            ))}
          </div>
        </Reveal>

        <div key={current.name} className="lp-swap mt-10 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="relative mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Reveal className="absolute left-0 right-0 top-6 hidden md:block">
            <div aria-hidden className="lp-grow-x h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent" />
          </Reveal>
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
              className="lp-shine group relative inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 font-semibold text-slate-900 transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
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
          <Link href="/privacy" className="hover:text-slate-900">Confidentialité</Link>
          <Link href="/terms" className="hover:text-slate-900">Conditions</Link>
        </div>
        <p className="text-sm text-slate-400">© {new Date().getFullYear()} Outlr · Données fournies par YouTube</p>
      </div>
    </footer>
  );
}

// --- SHARED ---

type Tone = "light" | "dark";

function SectionEyebrow({ icon: Icon, children, tone = "light" }: { icon: React.ElementType; children: React.ReactNode; tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-sm",
        tone === "light" ? "border-slate-200 bg-white text-slate-600" : "border-white/15 bg-white/[0.04] text-white/70"
      )}
    >
      <Icon className={cn("size-3.5", tone === "light" ? "text-orange-500" : "text-orange-400")} /> {children}
    </span>
  );
}

function SectionHeader({
  icon,
  eyebrow,
  title,
  subtitle,
  tone = "light",
}: {
  icon: React.ElementType;
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  tone?: Tone;
}) {
  return (
    <Reveal className="mx-auto max-w-3xl text-center">
      <SectionEyebrow icon={icon} tone={tone}>
        {eyebrow}
      </SectionEyebrow>
      <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{title}</h2>
      {subtitle && (
        <p className={cn("mx-auto mt-4 max-w-2xl text-pretty text-lg", tone === "light" ? "text-slate-500" : "text-white/55")}>{subtitle}</p>
      )}
    </Reveal>
  );
}
