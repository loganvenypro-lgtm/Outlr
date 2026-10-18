import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { ClientShell } from "@/app/client-shell";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Outlr — Trouvez votre prochaine vidéo atypique",
  description: "Découvrez les pépites YouTube hors-norme, analysez les outliers et trouvez des idées de contenu viral.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`h-full antialiased font-sans ${geist.variable}`}>
      <body className="min-h-full flex flex-col font-sans">
        <TooltipProvider>
          <ClientShell>{children}</ClientShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
