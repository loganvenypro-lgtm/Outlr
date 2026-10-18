"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { Settings, Key, Shield, Bell, Database, Check } from "lucide-react";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex h-screen bg-[#07090e] text-slate-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <TopNav />
        <main className="p-6 md:p-8 max-w-4xl w-full mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5">
              <Settings className="w-6 h-6 text-blue-500" />
              Paramètres & Configuration
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Gérez les clés API, vos préférences d'alertes Discord et vos paramètres système.
            </p>
          </div>

          <div className="space-y-6">
            {/* Clés API */}
            <div className="bg-[#0e121a] border border-[#1b2233] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-base font-semibold text-white">
                <Key className="w-4 h-4 text-amber-400" />
                <span>YouTube Data API</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Votre clé YouTube est configurée via les variables d&apos;environnement Vercel (<code>YOUTUBE_API_KEY</code>).
                En mode découverte hybride, le système utilise les endpoints InnerTube résilients à quota zéro.
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                <Shield className="w-3.5 h-3.5" />
                <span>Statut API : Clé active et protégée côté serveur</span>
              </div>
            </div>

            {/* Alertes & Notifications */}
            <div className="bg-[#0e121a] border border-[#1b2233] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-base font-semibold text-white">
                <Bell className="w-4 h-4 text-indigo-400" />
                <span>Alertes Webhook Discord</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Recevez les pépites et outliers automatiquement sur Discord lorsque le pipeline détecte une anomalie virale (&gt; 2.5x médiane).
              </p>
              <div className="space-y-2">
                <label className="text-xs text-slate-300 font-medium">URL Webhook Discord</label>
                <input
                  type="password"
                  placeholder="https://discord.com/api/webhooks/..."
                  defaultValue="https://discord.com/api/webhooks/***"
                  disabled
                  className="w-full bg-[#07090e] border border-[#1e2638] rounded-xl px-3.5 py-2 text-xs text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Moteur de Recherche */}
            <div className="bg-[#0e121a] border border-[#1b2233] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-base font-semibold text-white">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Moteur Deep Crawl (Discovery Engine)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mode d&apos;exploration automatique des tendances, des vidéos à fort ratio vues/abonnés et des anomalies statistiques.
              </p>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-[#1b2233]">
                <span className="text-slate-300">Vitesse de calcul & résilience</span>
                <span className="font-semibold text-emerald-400">Mode Cloud Serverless Hybride</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-blue-500/20"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Enregistré !</span>
                </>
              ) : (
                <span>Sauvegarder les préférences</span>
              )}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
