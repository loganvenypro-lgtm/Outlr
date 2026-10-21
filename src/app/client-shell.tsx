"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { FloatingAiAssistant } from "@/components/FloatingAiAssistant";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { THEMELESS_PATHS, useTheme } from "@/lib/theme";

export function ClientShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const { theme } = useTheme();

  // Full-screen pages without sidebar
  const isAuthOrLanding = THEMELESS_PATHS.includes(pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  // The dashboard follows the saved theme; public pages keep their own look.
  useEffect(() => {
    const dark = theme === "dark" && !isAuthOrLanding;
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [theme, isAuthOrLanding]);

  if (!mounted) {
    return null;
  }

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