"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  Loader2,
  Play,
  Rocket,
  Search,
  Sparkles,
  Terminal,
  Users,
  Video,
  SquarePlay,
  Megaphone,
} from "lucide-react";
import { formatCompactNumber } from "@/lib/utils";
import { NICHES, type NicheId } from "@/lib/nicheClassifier";
import type { ChannelEditorialProfile, CompetitorChannel, SimilarChannelsEngineResponse } from "@/types/competitorEngine";
import type { CompetitorInsights } from "@/lib/competitorInsights";

type Role = "creator" | "agency" | "brand" | "aspiring";
type Step = "role" | "channel" | "analysis" | "result";

type ChannelStats = Pick<ChannelEditorialProfile, "id" | "title" | "handle" | "avatar" | "banner" | "subscriberCount" | "totalViews" | "videoCount" | "country">;

type StreamEvent =
  | { type: "log"; message: string }
  | { type: "channel"; channel: ChannelStats }
  | { type: "videos"; videos: ChannelEditorialProfile["recentVideos"] }
  | { type: "niche"; profile: Omit<ChannelEditorialProfile, "recentVideos"> }
  | { type: "candidates"; count: number; queries: string[] }
  | { type: "competitor"; competitor: CompetitorChannel }
  | { type: "done"; result: SimilarChannelsEngineResponse }
  | { type: "insights"; insights: CompetitorInsights }
  | { type: "error"; message: string };

const ROLES: { id: Role; title: string; text: string; icon: React.ElementType }[] = [
  { id: "creator", title: "Je suis YouTubeur", text: "Je veux trouver mes prochaines vidéos virales", icon: SquarePlay },
  { id: "agency", title: "Agence / Manager", text: "Je gère une ou plusieurs chaînes", icon: Building2 },
  { id: "brand", title: "Marque / Sponsor", text: "Je cherche des créateurs dans une niche", icon: Megaphone },
  { id: "aspiring", title: "Je me lance", text: "Je n'ai pas encore de chaîne", icon: Rocket },
];

const SUGGESTIONS = [
  { label: "fern", handle: "@fern-tv" },
  { label: "Squeezie", handle: "@Squeezie" },
  { label: "Ali Abdaal", handle: "@aliabdaal" },
  { label: "Veritasium", handle: "@veritasium" },
];

const STEPS: { id: Step[]; label: string }[] = [
  { id: ["role"], label: "Profil" },
  { id: ["channel", "analysis"], label: "Ta chaîne" },
  { id: ["result"], label: "Tes concurrents" },
];

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** Counts up to `value` whenever it changes: the numbers "load" in front of the user. */
function CountUp({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(origin + (value - origin) * eased);
      setShown(current);
      from.current = current;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // rAF pauses in background tabs: land on the real value anyway
    const settle = setTimeout(() => {
      setShown(value);
      from.current = value;
    }, duration + 100);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [value, duration]);
  return <>{formatCompactNumber(shown)}</>;
}

function Avatar({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-500 font-bold text-white ${className}`}>
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setFailed(true)} referrerPolicy="no-referrer" className={`rounded-full object-cover ${className}`} />;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [noChannel, setNoChannel] = useState(false);
  const [channelInput, setChannelInput] = useState("");
  const [niche, setNiche] = useState<NicheId | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live analysis state, filled event by event
  const [logs, setLogs] = useState<{ at: number; message: string }[]>([]);
  const [channel, setChannel] = useState<ChannelStats | null>(null);
  const [videos, setVideos] = useState<ChannelEditorialProfile["recentVideos"]>([]);
  const [profile, setProfile] = useState<Omit<ChannelEditorialProfile, "recentVideos"> | null>(null);
  const [candidateCount, setCandidateCount] = useState(0);
  const [liveCompetitors, setLiveCompetitors] = useState<CompetitorChannel[]>([]);
  const [result, setResult] = useState<SimilarChannelsEngineResponse | null>(null);
  const [insights, setInsights] = useState<CompetitorInsights | null>(null);
  const [trackedIds, setTrackedIds] = useState<string[]>([]);
  const [isFinishing, setIsFinishing] = useState(false);
  const [now, setNow] = useState(0);

  const startedAt = useRef(0);
  const queue = useRef<StreamEvent[]>([]);
  const abort = useRef<AbortController | null>(null);
  const logBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => abort.current?.abort();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  // Ticks while the analysis runs, to show the scan is alive between two events
  useEffect(() => {
    if (step !== "analysis" || insights) return;
    const timer = setInterval(() => setNow(Date.now() - startedAt.current), 1000);
    return () => clearInterval(timer);
  }, [step, insights]);

  // Keep the terminal pinned to its latest line
  useEffect(() => {
    if (logBox.current) logBox.current.scrollTop = logBox.current.scrollHeight;
  }, [logs, now]);

  // Events land in bursts; reveal them one at a time so every piece of data gets its moment.
  useEffect(() => {
    if (step !== "analysis") return;
    const timer = setInterval(() => {
      const event = queue.current.shift();
      if (!event) return;
      const at = Date.now() - startedAt.current;
      switch (event.type) {
        case "log":
          setLogs((l) => [...l, { at, message: event.message }]);
          break;
        case "channel":
          setChannel(event.channel);
          break;
        case "videos":
          setVideos(event.videos);
          break;
        case "niche":
          setProfile(event.profile);
          break;
        case "candidates":
          setCandidateCount(event.count);
          setLogs((l) => [...l, { at, message: `${event.count} chaînes candidates à évaluer` }]);
          break;
        case "competitor":
          setLiveCompetitors((c) => [...c, event.competitor]);
          setLogs((l) => [...l, { at, message: `${event.competitor.channel.title} — ${event.competitor.similarityScore}% de similarité` }]);
          break;
        case "done":
          setResult(event.result);
          setTrackedIds(event.result.competitors.slice(0, 3).map((c) => c.channel.id));
          setLogs((l) => [...l, { at, message: `Analyse terminée : ${event.result.competitors.length} concurrents retenus` }]);
          break;
        case "insights":
          setInsights(event.insights);
          setLogs((l) => [...l, { at, message: "Recommandations IA prêtes ✓" }]);
          break;
        case "error":
          setError(event.message);
          setStep("channel");
          break;
      }
    }, 260);
    return () => clearInterval(timer);
  }, [step]);

  const startAnalysis = async (target?: string) => {
    const value = (target ?? channelInput).trim();
    if (!noChannel && !value) return;
    if (noChannel && !niche) return;

    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    queue.current = [];
    startedAt.current = Date.now();
    setError(null);
    setLogs([]);
    setChannel(null);
    setVideos([]);
    setProfile(null);
    setCandidateCount(0);
    setLiveCompetitors([]);
    setResult(null);
    setInsights(null);
    setStep("analysis");

    const params = new URLSearchParams({ role: role ?? "creator" });
    if (noChannel && niche) params.set("niche", niche);
    else params.set("channel", value);

    try {
      const res = await fetch(`/api/onboarding/analyze?${params}`, { signal: controller.signal });
      if (!res.ok || !res.body) throw new Error("Impossible de lancer l'analyse.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) if (line.trim()) queue.current.push(JSON.parse(line));
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      queue.current.push({ type: "error", message: err?.message || "Erreur lors de l'analyse." });
    }
  };

  const finish = async () => {
    setIsFinishing(true);
    try {
      localStorage.setItem("outlr_user_role", role ?? "creator");
      const tracked = result?.competitors.filter((c) => trackedIds.includes(c.channel.id)) ?? [];
      const ownChannel = !noChannel && role !== "brand" ? result?.reference : null;

      if (ownChannel) {
        await fetch("/api/youtube/tracking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "track_channel",
            channel: {
              channelId: ownChannel.id,
              name: ownChannel.title,
              handle: ownChannel.handle,
              avatar: ownChannel.avatar,
              subscribers: ownChannel.subscriberCount,
              totalViews: ownChannel.totalViews,
              videoCount: ownChannel.videoCount,
            },
            tags: [role === "agency" ? "Chaîne gérée" : "Ma chaîne"],
          }),
        });
        // Drives the personalised home
        await fetch("/api/me/channel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId: ownChannel.id }),
        });
      }

      await Promise.all(
        tracked.map((c) =>
          fetch("/api/youtube/tracking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "track_channel",
              channel: {
                channelId: c.channel.id,
                name: c.channel.title,
                handle: c.channel.handle,
                avatar: c.channel.avatar,
                subscribers: c.channel.subscriberCount,
                totalViews: c.channel.totalViews,
                videoCount: c.channel.videoCount,
              },
              tags: ["Concurrent"],
            }),
          })
        )
      );
    } catch {
      // Tracking is a bonus: never block the user out of the dashboard
    }
    localStorage.setItem("outlr_onboarding_completed", "true");
    router.push("/");
    router.refresh();
  };

  const skip = () => {
    abort.current?.abort();
    localStorage.setItem("outlr_onboarding_completed", "true");
    router.push("/");
  };

  const stepIndex = STEPS.findIndex((s) => s.id.includes(step));

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0c] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[40rem] bg-[radial-gradient(ellipse_55%_60%_at_50%_100%,rgba(249,115,22,0.18),rgba(244,63,94,0.06)_45%,transparent_75%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_50%_80%_at_50%_0%,rgba(244,63,94,0.12),transparent_70%)]" />

      {/* Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 p-1.5">
            <img src="/outlr-logo.png" alt="" className="size-5 object-contain" />
          </div>
          <span className="text-base font-bold tracking-tight">Outlr</span>
        </div>

        <ol className="hidden items-center gap-2 sm:flex">
          {STEPS.map((s, i) => (
            <li key={s.label} className="flex items-center gap-2">
              <span
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  i === stepIndex ? "bg-white/10 text-white ring-1 ring-white/15" : i < stepIndex ? "text-orange-300" : "text-white/35"
                }`}
              >
                <span
                  className={`flex size-4 items-center justify-center rounded-full text-[10px] font-bold ${
                    i < stepIndex ? "bg-orange-500 text-white" : i === stepIndex ? "bg-white text-black" : "bg-white/10"
                  }`}
                >
                  {i < stepIndex ? <Check className="size-2.5" /> : i + 1}
                </span>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <span className="h-px w-6 bg-white/10" />}
            </li>
          ))}
        </ol>

        <button onClick={skip} className="text-xs font-medium text-white/45 transition-colors hover:text-white">
          Passer
        </button>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        {/* STEP 1 — who are you */}
        {step === "role" && (
          <section className="mx-auto max-w-3xl pt-10 text-center sm:pt-16">
            <p className="ob-in text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Étape 1 sur 3</p>
            <h1 className="ob-in mt-3 text-3xl font-bold tracking-[-0.03em] sm:text-5xl" style={{ animationDelay: "60ms" }}>
              Bienvenue sur <span className="lp-gradient-text">Outlr</span>.<br />Tu es plutôt…
            </h1>
            <p className="ob-in mt-3 text-sm text-white/55" style={{ animationDelay: "120ms" }}>
              On adapte ton radar selon ton profil.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ROLES.map((r, i) => {
                const active = role === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    style={{ animationDelay: `${180 + i * 70}ms` }}
                    className={`ob-in group flex items-center gap-4 rounded-2xl border p-5 text-left transition-all ${
                      active
                        ? "border-orange-500/60 bg-orange-500/[0.08] shadow-[0_0_40px_-10px_rgba(249,115,22,0.5)]"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        active ? "bg-gradient-to-br from-rose-500 to-orange-500 text-white" : "bg-white/[0.06] text-white/70 group-hover:text-white"
                      }`}
                    >
                      <r.icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{r.title}</span>
                      <span className="block text-xs text-white/50">{r.text}</span>
                    </span>
                    <span className={`flex size-5 items-center justify-center rounded-full border transition-all ${active ? "border-orange-500 bg-orange-500" : "border-white/20"}`}>
                      {active && <Check className="size-3" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              disabled={!role}
              onClick={() => {
                setNoChannel(role === "aspiring");
                setStep("channel");
              }}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-7 py-3 text-sm font-semibold shadow-[0_0_34px_rgba(249,115,22,0.45)] transition-all hover:scale-[1.03] disabled:pointer-events-none disabled:opacity-30 disabled:shadow-none"
            >
              Continuer <ArrowRight className="size-4" />
            </button>
          </section>
        )}

        {/* STEP 2 — the channel */}
        {step === "channel" && (
          <section className="mx-auto max-w-2xl pt-10 text-center sm:pt-16">
            <button onClick={() => setStep("role")} className="ob-in mb-6 inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white">
              <ArrowLeft className="size-3.5" /> Retour
            </button>
            <p className="ob-in text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Étape 2 sur 3</p>
            <h1 className="ob-in mt-3 text-3xl font-bold tracking-[-0.03em] sm:text-5xl" style={{ animationDelay: "60ms" }}>
              {noChannel
                ? "Choisis ta future niche"
                : role === "agency"
                  ? "Quelle chaîne gères-tu ?"
                  : role === "brand"
                    ? "Une chaîne type de ta cible ?"
                    : "Colle le lien de ta chaîne"}
            </h1>
            <p className="ob-in mx-auto mt-3 max-w-md text-sm text-white/55" style={{ animationDelay: "120ms" }}>
              {noChannel
                ? "On part de la plus grosse chaîne de cette niche pour te montrer qui domine et ce qui marche."
                : "On récupère ses données en direct, on détecte sa niche et on cartographie tous ses concurrents."}
            </p>

            {error && (
              <div className="ob-in mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-200">{error}</div>
            )}

            {!noChannel ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  startAnalysis();
                }}
                className="ob-in mt-8"
                style={{ animationDelay: "180ms" }}
              >
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#141417]/95 p-2 shadow-2xl shadow-black/60 transition-all focus-within:border-orange-500/50 focus-within:shadow-[0_0_50px_-12px_rgba(249,115,22,0.6)]">
                  <SquarePlay className="ml-2 size-5 shrink-0 text-rose-500" />
                  <input
                    autoFocus
                    value={channelInput}
                    onChange={(e) => setChannelInput(e.target.value)}
                    placeholder="youtube.com/@tachaine ou @handle"
                    className="min-w-0 flex-1 bg-transparent px-1 text-sm text-white placeholder-white/30 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!channelInput.trim()}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-2.5 text-xs font-semibold transition-opacity disabled:opacity-30"
                  >
                    <Sparkles className="size-3.5" /> Analyser
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
                  <span className="text-white/40">Essayer avec</span>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.handle}
                      type="button"
                      onClick={() => {
                        setChannelInput(s.handle);
                        startAnalysis(s.handle);
                      }}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-white/70 transition-colors hover:border-white/25 hover:text-white"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </form>
            ) : (
              <div className="ob-in mt-8 flex flex-wrap justify-center gap-2" style={{ animationDelay: "180ms" }}>
                {NICHES.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setNiche(n.id)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                      niche === n.id ? "border-orange-500/70 bg-orange-500/15 text-white" : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {n.label}
                  </button>
                ))}
                <div className="mt-6 w-full">
                  <button
                    disabled={!niche}
                    onClick={() => startAnalysis()}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-7 py-3 text-sm font-semibold shadow-[0_0_34px_rgba(249,115,22,0.45)] transition-all hover:scale-[1.03] disabled:pointer-events-none disabled:opacity-30 disabled:shadow-none"
                  >
                    <Sparkles className="size-4" /> Explorer cette niche
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setNoChannel(!noChannel);
                setError(null);
              }}
              className="ob-in mt-8 text-xs font-medium text-white/45 underline-offset-4 hover:text-white hover:underline"
              style={{ animationDelay: "240ms" }}
            >
              {noChannel ? "J'ai une chaîne, je colle son lien" : "Je n'ai pas encore de chaîne"}
            </button>
          </section>
        )}

        {/* STEP 2b — live analysis */}
        {step === "analysis" && (
          <section className="pt-4">
            <div className="mb-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Analyse en direct</p>
              <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] sm:text-4xl">
                {result ? "Ton radar est prêt" : "On scanne ta niche…"}
              </h1>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
              {/* Channel card filling in */}
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111114]">
                  <div className="relative h-24 bg-gradient-to-r from-rose-500/20 via-orange-500/10 to-violet-500/20">
                    {channel?.banner && <img src={`${channel.banner}=w1200`} alt="" className="ob-fade absolute inset-0 size-full object-cover opacity-60" />}
                  </div>
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
                    <div className="-mt-14 shrink-0">
                      {channel ? (
                        <Avatar src={channel.avatar} alt={channel.title} className="ob-pop size-20 text-2xl ring-4 ring-[#111114]" />
                      ) : (
                        <div className="size-20 animate-pulse rounded-full bg-white/10 ring-4 ring-[#111114]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {channel ? (
                        <div className="ob-in">
                          <p className="truncate text-lg font-bold">{channel.title}</p>
                          <p className="text-xs text-white/45">{channel.handle}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
                          <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 border-t border-white/[0.06]">
                    {[
                      { label: "Abonnés", value: channel?.subscriberCount, icon: Users },
                      { label: "Vues totales", value: channel?.totalViews, icon: Eye },
                      { label: "Vues / vidéo", value: profile?.typicalViews, icon: Play },
                    ].map((s) => (
                      <div key={s.label} className="border-r border-white/[0.06] p-4 last:border-r-0">
                        <p className="flex items-center gap-1.5 text-[11px] text-white/40">
                          <s.icon className="size-3" /> {s.label}
                        </p>
                        <p className="mt-1 text-xl font-bold tabular-nums">
                          {s.value != null && s.value >= 0 ? <CountUp value={s.value} /> : <span className="text-white/20">—</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                  {profile && (
                    <div className="ob-in flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] p-4">
                      <span className="rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-2.5 py-0.5 text-[11px] font-semibold">{profile.archetypeLabel}</span>
                      {profile.editorialTags.map((t, i) => (
                        <span key={t} className="ob-pop rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-white/70" style={{ animationDelay: `${i * 90}ms` }}>
                          {t}
                        </span>
                      ))}
                      <span className="ml-auto text-[11px] text-white/40">~{formatDuration(profile.avgDurationSeconds)} / vidéo</span>
                    </div>
                  )}
                </div>

                {/* Recent videos popping in */}
                <div className="rounded-2xl border border-white/10 bg-[#111114] p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-white/60">
                    <Video className="size-3.5" /> Dernières vidéos analysées
                    {videos.length > 0 && <span className="ml-auto tabular-nums text-white/35">{videos.length}</span>}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {(videos.length ? videos.slice(0, 10) : Array.from({ length: 5 })).map((v: any, i) =>
                      v ? (
                        <div key={v.id} className="ob-pop" style={{ animationDelay: `${i * 110}ms` }}>
                          <div className="relative aspect-video overflow-hidden rounded-lg bg-white/5">
                            <img src={v.thumbnail} alt="" className="size-full object-cover" />
                            <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[9px] font-semibold">{formatCompactNumber(v.views)}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-white/55">{v.title}</p>
                        </div>
                      ) : (
                        <div key={i} className="aspect-video animate-pulse rounded-lg bg-white/5" />
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Log terminal + competitors appearing */}
              <div className="flex flex-col gap-4">
                <div className="flex h-64 flex-col rounded-2xl border border-white/10 bg-black/60 font-mono lg:h-72">
                  <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5 text-[11px] text-white/45">
                    <Terminal className="size-3.5" /> outlr — radar
                    {!insights && <Loader2 className="ml-auto size-3.5 animate-spin text-orange-400" />}
                  </div>
                  <div ref={logBox} className="flex-1 space-y-1 overflow-y-auto px-4 py-3 text-[11px] leading-relaxed">
                    {logs.map((l, i) => (
                      <p key={i} className="ob-fade text-white/70">
                        <span className="text-white/30">{(l.at / 1000).toFixed(1).padStart(5, "0")}s</span>{" "}
                        <span className="text-orange-400">›</span> {l.message}
                      </p>
                    ))}
                    {!insights && logs.length > 0 && now - logs[logs.length - 1].at > 2500 && (
                      <p className="text-white/40">
                        <span className="text-white/30">{(now / 1000).toFixed(1).padStart(5, "0")}s</span>{" "}
                        <span className="text-orange-400">›</span> {liveCompetitors.length ? "Scoring des chaînes candidates" : "Croisement avec les vidéos de la niche"}…
                      </p>
                    )}
                    {!insights && <span className="inline-block h-3 w-1.5 animate-pulse bg-orange-400 align-middle" />}
                  </div>
                </div>

                <div className="flex-1 rounded-2xl border border-white/10 bg-[#111114] p-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-white/60">
                    <Users className="size-3.5" /> YouTubeurs similaires
                    <span className="ml-auto tabular-nums text-white/35">
                      {liveCompetitors.length}
                      {candidateCount > 0 && ` / ${candidateCount}`}
                    </span>
                  </p>
                  {liveCompetitors.length === 0 ? (
                    <p className="flex items-center gap-2 text-xs text-white/35">
                      <Search className="size-3.5 animate-pulse" /> Recherche des chaînes qui visent la même audience…
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-x-3 gap-y-2.5">
                      {liveCompetitors.map((c) => (
                        <span key={c.channel.id} className="ob-pop flex items-center gap-1.5 text-xs text-white/80">
                          <Avatar src={c.channel.avatar} alt={c.channel.title} className="size-6 text-[10px]" />
                          <span className="max-w-[9rem] truncate">{c.channel.title}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                disabled={!result}
                onClick={() => setStep("result")}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-7 py-3 text-sm font-semibold shadow-[0_0_34px_rgba(249,115,22,0.45)] transition-all hover:scale-[1.03] disabled:pointer-events-none disabled:opacity-30 disabled:shadow-none"
              >
                {result ? (
                  <>
                    Voir mes {result.competitors.length} concurrents <ArrowRight className="size-4" />
                  </>
                ) : (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Analyse en cours
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* STEP 3 — results */}
        {step === "result" && result && (
          <ResultView
            result={result}
            insights={insights}
            noChannel={noChannel}
            trackedIds={trackedIds}
            onToggle={(id) => setTrackedIds((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]))}
            onFinish={finish}
            isFinishing={isFinishing}
          />
        )}
      </main>
    </div>
  );
}

function ResultView({
  result,
  insights,
  noChannel,
  trackedIds,
  onToggle,
  onFinish,
  isFinishing,
}: {
  result: SimilarChannelsEngineResponse;
  insights: CompetitorInsights | null;
  noChannel: boolean;
  trackedIds: string[];
  onToggle: (id: string) => void;
  onFinish: () => void;
  isFinishing: boolean;
}) {
  const ref = result.reference;
  const competitors = result.competitors.slice(0, 8);

  // Videos beating their channel's usual views: what works in the niche right now
  const nicheHits = result.competitors
    .flatMap((c) =>
      c.topSimilarVideos.map((v) => ({ ...v, channel: c.channel, multiplier: v.views / Math.max(c.channel.typicalViews, 1) }))
    )
    .filter((v) => v.views > 0)
    .sort((a, b) => b.multiplier - a.multiplier)
    .slice(0, 8);

  return (
    <section className="pt-4">
      <div className="ob-in flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Étape 3 sur 3</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
            {noChannel ? (
              <>
                Qui domine <span className="lp-gradient-text">ta future niche</span>
              </>
            ) : (
              <>
                Tes <span className="lp-gradient-text">{result.competitors.length} concurrents</span> directs
              </>
            )}
          </h1>
        </div>
        <button
          onClick={onFinish}
          disabled={isFinishing}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-2.5 text-sm font-semibold shadow-[0_0_34px_rgba(249,115,22,0.45)] transition-all hover:scale-[1.03] disabled:opacity-60"
        >
          {isFinishing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Ouvrir mon dashboard
        </button>
      </div>

      {/* AI summary */}
      <div className="ob-in relative mt-6 overflow-hidden rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/[0.08] to-rose-500/[0.04] p-5" style={{ animationDelay: "80ms" }}>
        <div className="flex items-start gap-4">
          <Avatar src={ref.avatar} alt={ref.title} className="size-12 shrink-0 text-lg" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              {ref.title}
              <span className="text-xs font-normal text-white/45">
                {formatCompactNumber(ref.subscriberCount)} abonnés · {ref.archetypeLabel}
              </span>
            </p>
            <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-white/80">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-orange-400" />
              {insights ? insights.summary : <span className="animate-pulse text-white/40">L’IA rédige ton analyse…</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Competitors with the AI's reasons */}
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        {competitors.map((c, i) => {
          const reason = insights?.reasons[c.channel.id];
          const tracked = trackedIds.includes(c.channel.id);
          return (
            <article
              key={c.channel.id}
              className="ob-in flex flex-col rounded-2xl border border-white/10 bg-[#111114] p-4 transition-colors hover:border-white/20"
              style={{ animationDelay: `${140 + i * 70}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="w-4 text-xs font-bold tabular-nums text-white/30">{i + 1}</span>
                <Avatar src={c.channel.avatar} alt={c.channel.title} className="size-11 shrink-0 text-base" />
                <div className="min-w-0 flex-1">
                  <a
                    href={`https://youtube.com/${c.channel.handle.startsWith("@") ? c.channel.handle : `channel/${c.channel.id}`}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-semibold hover:underline"
                  >
                    {c.channel.title}
                  </a>
                  <p className="text-[11px] text-white/45">
                    {formatCompactNumber(c.channel.subscriberCount)} abonnés · {formatCompactNumber(c.channel.typicalViews)} vues/vidéo
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums text-orange-400">{c.similarityScore}%</p>
                  <p className="text-[10px] text-white/35">similarité</p>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 rounded-xl bg-white/[0.03] p-3 text-xs leading-relaxed">
                {reason ? (
                  <>
                    <p className="text-white/80">
                      <span className="font-semibold text-white">Pourquoi : </span>
                      {reason.why}
                    </p>
                    {reason.steal && (
                      <p className="text-white/60">
                        <span className="font-semibold text-orange-300">À reprendre : </span>
                        {reason.steal}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <div className="h-3 w-full animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex min-w-0 flex-1 gap-1.5">
                  {c.topSimilarVideos.slice(0, 3).map((v) => (
                    <a key={v.id} href={`https://youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer" className="w-1/3 min-w-0" title={v.title}>
                      <img src={v.thumbnail} alt="" className="aspect-video w-full rounded-md object-cover opacity-80 transition-opacity hover:opacity-100" />
                    </a>
                  ))}
                </div>
                <button
                  onClick={() => onToggle(c.channel.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                    tracked ? "bg-orange-500 text-white" : "border border-white/15 text-white/70 hover:border-white/30 hover:text-white"
                  }`}
                >
                  {tracked ? "✓ Suivi" : "+ Suivre"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* What works in the niche */}
      {nicheHits.length > 0 && (
        <div className="mt-10">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Play className="size-4 fill-orange-400 text-orange-400" /> Ce qui marche dans ta niche
          </h2>
          <p className="mt-1 text-xs text-white/45">Les vidéos récentes de tes concurrents qui dépassent leurs vues habituelles.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {nicheHits.map((v, i) => (
              <a
                key={v.id}
                href={`https://youtube.com/watch?v=${v.id}`}
                target="_blank"
                rel="noreferrer"
                className="ob-in group rounded-xl border border-white/[0.07] bg-[#151518] p-1"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="relative aspect-video overflow-hidden rounded-lg">
                  <img src={v.thumbnail} alt="" className="size-full object-cover transition-transform group-hover:scale-105" />
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-gradient-to-r from-rose-500 to-orange-500 px-1.5 py-0.5 text-[10px] font-bold">
                    {v.multiplier.toFixed(1)}x
                  </span>
                </div>
                <div className="p-2">
                  <p className="line-clamp-2 text-xs font-medium leading-snug">{v.title}</p>
                  <p className="mt-1 truncate text-[10px] text-white/40">
                    {v.channel.title} · {formatCompactNumber(v.views)} vues
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <button
          onClick={onFinish}
          disabled={isFinishing}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-7 py-3 text-sm font-semibold shadow-[0_0_34px_rgba(249,115,22,0.45)] transition-all hover:scale-[1.03] disabled:opacity-60"
        >
          {isFinishing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Suivre {trackedIds.length} chaîne{trackedIds.length > 1 ? "s" : ""} et ouvrir mon dashboard
        </button>
      </div>
    </section>
  );
}
