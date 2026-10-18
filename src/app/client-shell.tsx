"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { FloatingAiAssistant } from "@/components/FloatingAiAssistant";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export function ClientShell({ children }: { children: React.ReactNode }) {
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

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-white text-slate-900 font-sans">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 bg-white">
          <div className="flex-1 overflow-y-auto bg-white">{children}</div>
        </SidebarInset>
        <FloatingAiAssistant />
      </div>
    </SidebarProvider>
  );
}