"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { TopNav } from "@/components/TopNav";
import { FloatingAiAssistant } from "@/components/FloatingAiAssistant";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.documentElement.classList.remove("dark");
    document.body.style.background = "#ffffff";
    document.body.style.color = "#0f172a";
  }, []);

  if (!mounted) {
    return null;
  }

  // Determine page title for TopNav
  let pageTitle = "Dashboard";
  if (pathname === "/niche-finder") pageTitle = "Viral Niche Finder";
  else if (pathname === "/stats") pageTitle = "Pipeline & Outlier Stats";
  else if (pathname === "/trending") pageTitle = "Radar & Tendances";
  else if (pathname === "/viral-chat") pageTitle = "Viral AI Strategist";
  else if (pathname === "/tracking") pageTitle = "Channel Tracking Radar";
  else if (pathname.startsWith("/dashboard/similar-channels")) pageTitle = "Concurrents & Audience";
  else if (pathname === "/thumbnail-intelligence") pageTitle = "Miniatures & Packaging";
  else if (pathname === "/tubelab") pageTitle = "TubeLab Studio";
  else if (pathname === "/title-lab") pageTitle = "Titre & Copywriting";
  else if (pathname === "/sponsors") pageTitle = "Revenus & Sponsos";
  else if (pathname === "/leads") pageTitle = "Marques & Sponsors";

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-white text-slate-900 font-sans">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 bg-white">
          <TopNav title={isHome ? "Vidéos Atypiques" : pageTitle} />
          <main className="flex-1 overflow-y-auto bg-white">{children}</main>
        </SidebarInset>
        <FloatingAiAssistant />
      </div>
    </SidebarProvider>
  );
}