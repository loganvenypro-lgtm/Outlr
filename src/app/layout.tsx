import type { Metadata } from "next";
import "./globals.css";
import { FloatingAiAssistant } from "@/components/FloatingAiAssistant";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "NewIQ — YouTube Analytics & Sponsor Intelligence",
  description: "Plateforme de Creator Intelligence & Sponsor Discovery inspirée de ViewStats et MeetSponsors.",
};

import { TooltipProvider } from "@/components/ui/tooltip";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={cn("h-full antialiased dark", "font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col bg-[#080c14] text-slate-100 font-sans">
        <TooltipProvider>
          {children}
          <FloatingAiAssistant />
        </TooltipProvider>
      </body>
    </html>
  );
}
