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
      <div className="flex h-svh w-full overflow-hidden bg-sidebar font-sans text-slate-900 antialiased">
        <AppSidebar />
        {/* The page sits on a framed panel that scrolls on its own, so the sidebar and frame stay put. */}
        <SidebarInset className="h-svh min-w-0 overflow-hidden bg-white md:h-[calc(100svh-1rem)] md:peer-data-[variant=inset]:shadow-[0_1px_3px_rgb(15_23_42/0.06),0_0_0_1px_rgb(15_23_42/0.07)] dark:md:peer-data-[variant=inset]:shadow-[0_0_0_1px_var(--border)]">
          <div className="min-h-0 flex-1 overflow-y-auto bg-white">
            {children}
          </div>
        </SidebarInset>
        <FloatingAiAssistant />
      </div>
    </SidebarProvider>
  );
}