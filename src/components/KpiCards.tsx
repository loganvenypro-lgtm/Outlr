import { ChannelDetail } from "@/types/youtube";
import { formatCompactNumber, formatFullNumber } from "@/lib/utils";
import { Users, Eye, Video, Calculator, TrendingUp } from "lucide-react";

interface KpiCardsProps {
  channel: ChannelDetail;
}

export function KpiCards({ channel }: KpiCardsProps) {
  // Calculate average views per video
  const avgViewsPerVideo =
    channel.videoCount > 0 ? Math.round(channel.viewCount / channel.videoCount) : null;

  const kpis = [
    {
      title: "Subscribers",
      value: channel.hiddenSubscriberCount ? "Hidden" : formatCompactNumber(channel.subscriberCount),
      exact: channel.hiddenSubscriberCount ? "Hidden by creator" : formatFullNumber(channel.subscriberCount),
      icon: Users,
      iconColor: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      title: "Total Lifetime Views",
      value: formatCompactNumber(channel.viewCount),
      exact: formatFullNumber(channel.viewCount),
      icon: Eye,
      iconColor: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
    {
      title: "Total Uploaded Videos",
      value: formatCompactNumber(channel.videoCount),
      exact: formatFullNumber(channel.videoCount),
      icon: Video,
      iconColor: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20",
    },
    {
      title: "Avg Views Per Video",
      value: avgViewsPerVideo !== null ? formatCompactNumber(avgViewsPerVideo) : "N/A",
      exact: avgViewsPerVideo !== null ? `${formatFullNumber(avgViewsPerVideo)} views` : "Cannot calculate",
      icon: Calculator,
      iconColor: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div
            key={idx}
            className="bg-[#0e1628] border border-[#1e2b46] rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">{kpi.title}</span>
              <div className={`p-2 rounded-xl ${kpi.bgColor} border ${kpi.borderColor}`}>
                <Icon className={`w-4 h-4 ${kpi.iconColor}`} />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl font-black text-white tracking-tight">
                {kpi.value}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate" title={kpi.exact}>
                {kpi.exact}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
