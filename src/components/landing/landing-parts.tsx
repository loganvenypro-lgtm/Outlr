"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface LandingVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  channelAvatar: string | null;
  channelSubscribers: number;
  viewCount: number;
  outlierMultiplier: number;
  publishedAt: string;
  duration: string;
}

// --- FORMATTERS ---

const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
const grouped = new Intl.NumberFormat("fr-FR");

export const formatCompact = (n: number) => compact.format(n);
export const formatNumber = (n: number) => grouped.format(n);

export function formatMultiplier(n: number) {
  return n >= 100 ? `×${Math.round(n)}` : `×${n.toFixed(1).replace(".0", "")}`;
}

export function timeAgo(iso: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (days === 0) return "aujourd'hui";
  if (days < 30) return `il y a ${days} j`;
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
  const years = Math.floor(days / 365);
  return `il y a ${years} an${years > 1 ? "s" : ""}`;
}

// --- MOTION HELPERS ---

/** Fades children in the first time they scroll into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Content already on screen at load shouldn't wait for the observer's first callback.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("lp-reveal", visible && "lp-reveal-in", className)}
    >
      {children}
    </Tag>
  );
}

/** Counts from 0 to `value` once visible. */
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1600);
        const step = 10 ** decimals;
        setDisplay(Math.round(value * (1 - Math.pow(1 - t, 4)) * step) / step);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, decimals]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {formatNumber(display)}
      {suffix}
    </span>
  );
}

/** Cycles through words with a typing effect. */
export function Typewriter({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[index % words.length];
    const done = !deleting && length === word.length;
    const empty = deleting && length === 0;
    const delay = done ? 1600 : empty ? 250 : deleting ? 35 : 70;

    const timer = setTimeout(() => {
      if (done) setDeleting(true);
      else if (empty) {
        setDeleting(false);
        setIndex((i) => i + 1);
      } else setLength((l) => l + (deleting ? -1 : 1));
    }, delay);
    return () => clearTimeout(timer);
  }, [words, index, length, deleting]);

  return (
    <span>
      {words[index % words.length].slice(0, length)}
      <span className="lp-caret ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-orange-500" />
    </span>
  );
}

/** Card with a soft light that follows the cursor. */
export function SpotlightCard({
  children,
  className,
  tone = "light",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--y", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={cn(
        "lp-spotlight group relative overflow-hidden rounded-3xl border transition-all duration-300",
        tone === "light"
          ? "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md"
          : "lp-spotlight-dark border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-orange-400/30 hover:bg-white/[0.05]",
        className
      )}
    >
      {children}
    </div>
  );
}

// --- VIDEO CARD ---

/** Stored avatar URLs go stale when a channel changes its picture, so a failed load falls back to a grey disc. */
export function ChannelAvatar({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className="size-7 shrink-0 rounded-full bg-slate-200" />;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-7 shrink-0 rounded-full ring-1 ring-slate-200"
    />
  );
}

export function VideoCard({ video, compactCard = false }: { video: LandingVideo; compactCard?: boolean }) {
  return (
    <div className="group/card flex min-w-0 flex-col gap-2.5">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
        <img
          src={video.thumbnail}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover/card:scale-105"
        />
        <span className="absolute left-2 top-2 rounded-md bg-gradient-to-r from-rose-500 to-orange-400 px-1.5 py-0.5 text-[11px] font-bold text-white shadow-md shadow-rose-500/30">
          {formatMultiplier(video.outlierMultiplier)}
        </span>
        <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1 py-0.5 text-[10px] font-medium text-white">
          {video.duration}
        </span>
      </div>
      <div className="flex gap-2.5">
        {!compactCard && <ChannelAvatar src={video.channelAvatar} />}
        <div className="min-w-0">
          <p className={cn("line-clamp-2 font-medium leading-snug text-slate-800", compactCard ? "text-[11px]" : "text-sm")}>
            {video.title}
          </p>
          <p className={cn("mt-1 truncate text-slate-500", compactCard ? "text-[10px]" : "text-xs")}>
            {video.channelTitle} · {formatCompact(video.viewCount)} vues · {timeAgo(video.publishedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
