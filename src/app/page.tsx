import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { Suspense } from "react";
import { ChannelSearchDashboard } from "@/components/ChannelSearchDashboard";

export default function HomePage() {
  return (
    <div className="flex min-h-screen bg-[#080c14]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav title="Channel Search" />
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading NewIQ...</div>}>
            <ChannelSearchDashboard />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
