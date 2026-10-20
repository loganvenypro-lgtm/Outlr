import { ChannelView } from "@/components/channel/channel-view";

export default async function ChannelPage({ params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params;
  return <ChannelView channelId={decodeURIComponent(channelId)} />;
}
