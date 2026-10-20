"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { FloatingAiAssistant } from "@/components/FloatingAiAssistant";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export function ClientShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    document.documentElement.classList.remove("dark");
    document.body.style.background = "#ffffff";
    document.body.style.color = "#0f172a";
  }, []);

  if (!mounted) {
    return null;
  }

  // Full-screen pages without sidebar
  const isAuthOrLanding =
    pathname === "/login" || pathname === "/welcome" || pathname === "/onboarding";

  if (isAuthOrLanding) {
    return (
      <main className="min-h-screen w-full bg-white font-sans text-slate-900 antialiased">
        {children}
      </main>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-white font-sans text-slate-900 antialiased">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col bg-white">
          <div className="flex-1 overflow-y-auto bg-white">{children}</div>
        </SidebarInset>
        <FloatingAiAssistant />
      </div>
    </SidebarProvider>
  );
}