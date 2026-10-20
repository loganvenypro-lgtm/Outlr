import { Suspense } from "react";
import { ChannelTrendsExplorer } from "@/components/channel-trends/channel-trends-explorer";

export default function ChannelFinderPage() {
  return (
    <Suspense>
      <ChannelTrendsExplorer variant="finder" />
    </Suspense>
  );
}
