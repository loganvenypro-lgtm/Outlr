"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import {
  Send,
  Sparkles,
  Flame,
  TrendingUp,
  Video,
  Bot,
  User,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  Copy,
  Check,
  RefreshCw,
  Zap,
  HelpCircle,
  Database,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: string;
  matchedVideos?: Array<{
    id: string;
    title: string;
    channelTitle: string;
    viewCount: number;
    outlierMultiplier: number;
    viralBreakoutScore: number;
    durationFormatted: string;
  }>;
}

const PRESET_QUESTIONS = [
  {
    title: "Pourquoi cette vidéo a explosé ?",
    prompt: "Analyse pour moi la vidéo 'How IShowSpeed Went From $0 To Millionaire' et explique pourquoi elle a surperformé avec 1.8M de vues sur une petite chaîne.",
    badge: "Décryptage Outlier",
  },
  {
    title: "Comment reproduire un format à 50x ?",
    prompt: "Quels sont les title patterns qui génèrent le plus de vues actuellement dans la base de données ? Donne-moi 3 idées concrètes à tester.",
    badge: "Stratégie Packaging",
  },
  {
    title: "Mécanique du VSR & Sortie de bulle",
    prompt: "Explique-moi la différence entre un bon ratio VSR (vues/abonnés) et un simple coup de chance algorithmique selon tes données.",
    badge: "Algorithme",
  },
  {
    title: "Idées de titres pour ma prochaine vidéo",
    prompt: "Propose-moi 5 variantes de titres irrésistibles en appliquant les 12 patterns psychologiques (Was Right All Along, The Hunt for, etc.) pour un sujet Tech/IA.",
    badge: "Idéation",
  },
];

export default function ViralChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      content: `👋 **Bonjour ! Je suis ton Viral YouTube Strategist IA.**

J'ai accès direct et en temps réel à **toutes les données de ton pipeline** :
- 📊 **Plus de 14 600 vidéos scrapées** et **3 000 pépites virales** qualifiées.
- 🎯 **Métriques réelles** : Multiplicateurs d'outliers (jusqu'à 300x+), ratio VSR (Vues/Abonnés), vélocité journalière (VPD) et scores composites 1of10.
- 🧠 **Détecteur de 12 patterns psychologiques de titres** (*Was Right All Along*, *The Hunt for*, *Iceberg*, *Top N Things*...).

**Pose-moi n'importe quelle question sur une vidéo, colle une URL YouTube ou demande pourquoi un format explose !**`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMessageId = `msg-${Date.now()}`;
    const userMsg: Message = {
      id: userMessageId,
      sender: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat/viral-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const data = await response.json();
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "assistant",
        content: data.reply || "Désolé, je n'ai pas pu formuler de réponse pour le moment.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        matchedVideos: data.matchedVideos,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: "assistant",
          content: `⚠️ Une erreur s'est produite lors de la connexion à l'IA : ${err.message}. Veuillez réessayer.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-full flex-col bg-white text-slate-900 font-sans antialiased overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col max-w-6xl w-full mx-auto p-4 md:p-6 overflow-hidden">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-950">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                    YouTube Viral AI Strategist
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-[10px] font-bold">
                    120B Reasoning • RAG 14.6k+
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Pose tes questions sur pourquoi une vidéo a marché, analyse un titre ou demande un plan d'action.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/niche-finder"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium transition-colors"
              >
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Radar Outliers</span>
              </Link>
              <Link
                href="/stats"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium transition-colors"
              >
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span>Base de Données</span>
              </Link>
            </div>
          </div>

          {/* Messages Flow */}
          <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-2">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 md:gap-4 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] md:max-w-[78%] rounded-2xl p-4 shadow-xl ${
                      isUser
                        ? "bg-purple-600 text-white rounded-tr-sm"
                        : "bg-slate-50 border border-slate-200 text-slate-700 rounded-tl-sm"
                    }`}
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-white/10 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-600">
                        {isUser ? "Toi" : "Viral Strategist IA"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>{msg.timestamp}</span>
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="hover:text-slate-900 transition-colors"
                            title="Copier la réponse"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content formatted with basic markdown rendering */}
                    <div className="text-sm leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>

                    {/* Matched Outlier Cards if present */}
                    {msg.matchedVideos && msg.matchedVideos.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          <span>Pépites associées dans la base :</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.matchedVideos.slice(0, 2).map((vid) => (
                            <a
                              key={vid.id}
                              href={`https://www.youtube.com/watch?v=${vid.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-purple-500/40 transition-colors flex items-center justify-between gap-2 group"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-900 truncate group-hover:text-purple-300">
                                  {vid.title}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {vid.channelTitle} • {vid.viewCount.toLocaleString()} vues
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600/80 text-white shrink-0">
                                {vid.outlierMultiplier}x
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 justify-start items-center text-slate-500 text-xs">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  <span>L'IA analyse la base de données et rétro-ingénie l'algorithme...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Presets Questions Suggestions */}
          <div className="py-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Questions fréquentes pré-configurées :</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {PRESET_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(q.prompt)}
                  disabled={loading}
                  className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-purple-500/30 text-left transition-all group disabled:opacity-50"
                >
                  <div className="text-[10px] font-mono text-purple-400 font-bold mb-0.5">
                    {q.badge}
                  </div>
                  <div className="text-xs font-semibold text-slate-700 group-hover:text-white line-clamp-1">
                    {q.title}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <div className="pt-2 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ex: Pourquoi la vidéo X a fait 5M de vues ? / Analyse ce lien : https://www.youtube.com/watch?v=..."
                disabled={loading}
                className="w-full bg-white border border-slate-200 focus:border-purple-500/60 rounded-2xl px-4 py-3.5 pr-24 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors shadow-2xl"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-950 transition-all disabled:opacity-40"
                >
                  <span>Envoyer</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
              <span>IA connectée au pipeline en continu (14 658 vidéos & 3 000 outliers)</span>
              <span>Propulsé par Groq 120B • Zéro Quota</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
