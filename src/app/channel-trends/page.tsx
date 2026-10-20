import { Suspense } from "react";
import { ChannelTrendsExplorer } from "@/components/channel-trends/channel-trends-explorer";

export default function ChannelTrendsPage() {
  return (
    <Suspense>
      <ChannelTrendsExplorer />
    </Suspense>
  );
}
