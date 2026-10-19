import { Hero1 } from "@/components/hero1";
import Link from "next/link";
import { Flame } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navbar */}
      <header className="border-b border-border/60 bg-background/95 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-foreground group">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm group-hover:scale-105 transition-transform">
              <Flame className="size-4 fill-primary-foreground" />
            </div>
            <span className="text-xl tracking-tight font-black">Outlr</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground px-3.5 py-2 rounded-lg hover:bg-muted transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-sm hover:bg-primary/90 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Official Shadcn Hero Block */}
      <main>
        <Hero1
          badge={{
            text: "YouTube Outlier Radar v2.0",
            announcement: "Zero-quota AI scraping engine",
            url: "/channel-trends",
          }}
          heading="Discover outlier YouTube videos before everyone else."
          description="Analyze real-time breakout ratios, track fast-growing channels, and identify saturated vs. blue ocean YouTube niches without API quota limits."
          buttons={{
            primary: {
              text: "Launch Free Trial",
              url: "/login",
            },
            secondary: {
              text: "Explore Channel Trends",
              url: "/channel-trends",
            },
          }}
          image={{
            src: "https://cdn.shadcnblocks.com/shadcnblocks/image-set/modern/saas-details/saas-1-16x9.png",
            alt: "Outlr YouTube Discovery Platform",
          }}
        />
      </main>
    </div>
  );
}
