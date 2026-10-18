import { HeroSearch } from "@/components/home/HeroSearch";
import { VideosGrid } from "@/components/home/VideosGrid";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSearch />
      <VideosGrid />
    </div>
  );
}
