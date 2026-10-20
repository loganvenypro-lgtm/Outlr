"use client";

import { Suspense } from "react";
import { ChannelSearchDashboard } from "@/components/ChannelSearchDashboard";

export default function ChannelFinderPage() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={<div className="p-8 text-center text-slate-400">Chargement du Channel Finder...</div>}>
        <ChannelSearchDashboard />
      </Suspense>
    </div>
  );
}
