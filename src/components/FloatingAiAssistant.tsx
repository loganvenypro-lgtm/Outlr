"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  Send, 
  X, 
  MessageSquare, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  Building, 
  Mail, 
  DollarSign, 
  ChevronRight,
  Loader2
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  time: string;
}

export function FloatingAiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ai",
      text: "Bonjour ! Je suis l'assistant IA Sponsor & Creator Intelligence. Posez-moi des questions sur les marques, les tarifs CPM de sponsoring, ou demandez-moi de vous trouver un email de contact !",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "ai",
            text: data.reply,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        throw new Error(data.error || "Erreur de réponse");
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "Désolé, je rencontre un problème de connexion temporaire. Réessayez dans un instant.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        // A round button that unfolds its label on hover, so it doesn't sit on top of the cards.
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Discuter avec l'IA Sponsors"
          className="group fixed right-5 bottom-5 z-50 flex h-11 items-center rounded-full bg-slate-900 px-3 text-white shadow-lg shadow-slate-900/20 transition-shadow hover:shadow-xl"
        >
          <span className="relative">
            <Bot className="size-5" />
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
          </span>
          <span className="max-w-0 overflow-hidden text-[13px] font-semibold whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-2 group-hover:max-w-52 group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-52 group-focus-visible:opacity-100">
            {"Discuter avec l'IA Sponsors"}
          </span>
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div
          className={`fixed bottom-5 right-5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-900/15 flex flex-col overflow-hidden transition-all duration-300 ${
            isExpanded ? "w-[92vw] sm:w-[600px] h-[80vh]" : "w-[92vw] sm:w-[420px] h-[550px]"
          }`}
        >
          {/* Header */}
          <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <span>IA Sponsor & Creator Intel</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                </h3>
                <span className="text-[10px] text-slate-500 block -mt-0.5">
                  Conseil en sponsoring, CPM & contacts
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
                title={isExpanded ? "Réduire" : "Agrandir"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] whitespace-nowrap">
            <span className="text-slate-500 font-medium">Idées :</span>
            <button
              type="button"
              onClick={() => handleQuickPrompt("Quel est le contact chez NordVPN ?")}
              className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-400 transition-colors"
            >
              Contact NordVPN
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrompt("Quels sont les tarifs CPM usuels sur YouTube ?")}
              className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-400 transition-colors"
            >
              Tarifs & CPM
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrompt("Comment rédiger un bon mail de démarchage de marque ?")}
              className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-400 transition-colors"
            >
              Structure Pitch Mail
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "ai" && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20"
                      : "bg-slate-50 border border-slate-200 text-slate-700 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span
                    className={`text-[9px] block text-right mt-1.5 ${
                      msg.sender === "user" ? "text-blue-200" : "text-slate-500"
                    }`}
                  >
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center text-xs text-slate-500 bg-white p-3 rounded-2xl w-32 border border-slate-200">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span>Réflexion...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez une question sur les sponsors, les marques, les tarifs..."
              className="flex-1 bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-all shadow-md shadow-blue-600/30"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
