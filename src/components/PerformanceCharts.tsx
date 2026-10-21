"use client";

import { useState } from "react";
import { RecentVideo } from "@/types/youtube";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import { 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Cell
} from "recharts";
import { 
  BarChart2, 
  LineChart as LineChartIcon,
  Info, 
  TrendingUp, 
  ThumbsUp, 
  MessageSquare, 
  Sparkles,
  Zap,
  Clock,
  Activity
} from "lucide-react";

interface PerformanceChartsProps {
  videos: RecentVideo[];
}

export function PerformanceCharts({ videos }: PerformanceChartsProps) {
  const [activeMetric, setActiveMetric] = useState<"views" | "likes" | "comments" | "engagement">("views");
  const [chartType, setChartType] = useState<"bar" | "area">("area");

  if (!videos || videos.length === 0) {
    return null;
  }

  // Derived statistics on this sample
  const viewCounts = videos.map((v) => v.viewCount).sort((a, b) => a - b);
  const totalSampleViews = viewCounts.reduce((acc, curr) => acc + curr, 0);
  const avgSampleViews = Math.round(totalSampleViews / videos.length);
  
  // Median calculation
  const mid = Math.floor(viewCounts.length / 2);
  const medianSampleViews =
    viewCounts.length % 2 !== 0
      ? viewCounts[mid]
      : Math.round((viewCounts[mid - 1] + viewCounts[mid]) / 2);

  const highestVideo = [...videos].sort((a, b) => b.viewCount - a.viewCount)[0];
  const lowestVideo = [...videos].sort((a, b) => a.viewCount - b.viewCount)[0];

  const totalLikes = videos.reduce((acc, v) => acc + (v.likeCount || 0), 0);
  const avgLikes = Math.round(totalLikes / videos.length);

  const totalComments = videos.reduce((acc, v) => acc + (v.commentCount || 0), 0);
  const avgComments = Math.round(totalComments / videos.length);

  // Overall engagement rate (Likes + Comments) / Views on recent batch
  const overallEngagement = totalSampleViews > 0 
    ? (((totalLikes + totalComments) / totalSampleViews) * 100).toFixed(2)
    : "0.00";

  // Chronological order for chart
  const chartData = [...videos].reverse().map((v, index) => {
    const videoEngagement = v.viewCount > 0 
      ? Number(((((v.likeCount || 0) + (v.commentCount || 0)) / v.viewCount) * 100).toFixed(2))
      : 0;

    return {
      name: `#${index + 1}`,
      fullTitle: v.title,
      date: formatDate(v.publishedAt),
      views: v.viewCount,
      likes: v.likeCount || 0,
      comments: v.commentCount || 0,
      engagement: videoEngagement,
      duration: v.durationFormatted || "--:--",
      url: `https://www.youtube.com/watch?v=${v.id}`,
    };
  });

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xl max-w-xs space-y-1.5 text-xs">
          <p className="font-bold text-slate-900 line-clamp-2 leading-snug">{data.fullTitle}</p>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{data.date}</span>
            <span className="font-mono bg-white px-1.5 py-0.5 rounded text-slate-600">⏱ {data.duration}</span>
          </div>
          <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
            <p className="text-blue-400 font-semibold flex justify-between gap-4">
              <span>Views:</span>
              <span className="font-mono text-slate-900">{data.views.toLocaleString()}</span>
            </p>
            {data.likes > 0 && (
              <p className="text-emerald-400 font-semibold flex justify-between gap-4">
                <span>Likes:</span>
                <span className="font-mono text-slate-900">{data.likes.toLocaleString()}</span>
              </p>
            )}
            {data.comments > 0 && (
              <p className="text-indigo-400 font-semibold flex justify-between gap-4">
                <span>Comments:</span>
                <span className="font-mono text-slate-900">{data.comments.toLocaleString()}</span>
              </p>
            )}
            <p className="text-amber-400 font-semibold flex justify-between gap-4 pt-1 border-t border-slate-200">
              <span>Engagement rate:</span>
              <span className="font-mono text-slate-900">{data.engagement}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Derived metrics banner (ViewStats Pro layout) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Sample Avg Views
          </span>
          <span className="text-base font-bold text-slate-900 block">
            {formatCompactNumber(avgSampleViews)}
          </span>
          <span className="text-[10px] text-slate-500">Last {videos.length} uploads</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Sample Median Views
          </span>
          <span className="text-base font-bold text-slate-900 block">
            {formatCompactNumber(medianSampleViews)}
          </span>
          <span className="text-[10px] text-slate-500">Robust center point</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Highest in Batch
          </span>
          <span className="text-base font-bold text-emerald-400 block truncate">
            {formatCompactNumber(highestVideo?.viewCount)}
          </span>
          <span className="text-[10px] text-slate-500 truncate block" title={highestVideo?.title}>
            {highestVideo?.title || "N/A"}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Avg Engagement Rate
          </span>
          <span className="text-base font-bold text-sky-400 block">
            {overallEngagement}%
          </span>
          <span className="text-[10px] text-slate-500">(Likes + Comms) / Views</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Avg Likes / Video
          </span>
          <span className="text-base font-bold text-slate-900 block">
            {formatCompactNumber(avgLikes)}
          </span>
          <span className="text-[10px] text-slate-500">From public counts</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Avg Comments / Video
          </span>
          <span className="text-base font-bold text-slate-900 block">
            {formatCompactNumber(avgComments)}
          </span>
          <span className="text-[10px] text-slate-500">From public counts</span>
        </div>
      </div>

      {/* Main Interactive Chart Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-slate-900 text-base">Recent Video Performance Distribution</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>
                Displays progression across the last {videos.length} uploads from oldest to newest.
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chart Type Toggle (Area vs Bar) */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setChartType("area")}
                className={`p-1.5 rounded-lg transition-all ${
                  chartType === "area" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Trend Area Chart"
              >
                <LineChartIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setChartType("bar")}
                className={`p-1.5 rounded-lg transition-all ${
                  chartType === "bar" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
                title="Bar Chart"
              >
                <BarChart2 className="w-4 h-4" />
              </button>
            </div>

            {/* Metric Selector Buttons */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveMetric("views")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeMetric === "views"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Views
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric("likes")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeMetric === "likes"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Likes
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric("comments")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeMetric === "comments"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Comments
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric("engagement")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeMetric === "engagement"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Engagement %
              </button>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={
                      activeMetric === "views" ? "#2563eb" :
                      activeMetric === "likes" ? "#10b981" :
                      activeMetric === "comments" ? "#818cf8" : "#f59e0b"
                    } stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={
                      activeMetric === "views" ? "#2563eb" :
                      activeMetric === "likes" ? "#10b981" :
                      activeMetric === "comments" ? "#818cf8" : "#f59e0b"
                    } stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#16223a" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#1e2a44" }}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => activeMetric === "engagement" ? `${val}%` : formatCompactNumber(val)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey={activeMetric} 
                  stroke={
                    activeMetric === "views" ? "#3b82f6" :
                    activeMetric === "likes" ? "#10b981" :
                    activeMetric === "comments" ? "#818cf8" : "#f59e0b"
                  } 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#metricGradient)" 
                />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#16223a" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#1e2a44" }}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => activeMetric === "engagement" ? `${val}%` : formatCompactNumber(val)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey={activeMetric} 
                  radius={[6, 6, 0, 0]}
                  animationDuration={800}
                >
                  {chartData.map((entry, index) => {
                    let fillColor = "#2563eb";
                    if (activeMetric === "views") {
                      fillColor = entry.views === highestVideo?.viewCount ? "#38bdf8" : "#2563eb";
                    } else if (activeMetric === "likes") {
                      fillColor = "#10b981";
                    } else if (activeMetric === "comments") {
                      fillColor = "#818cf8";
                    } else {
                      fillColor = "#f59e0b";
                    }
                    return <Cell key={`cell-${index}`} fill={fillColor} />;
                  })}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 px-2 pt-2 border-t border-slate-200">
          <span>← Plus ancienne du lot</span>
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
              <span>Progression récente</span>
            </span>
          </span>
          <span>Dernier upload →</span>
        </div>
      </div>
    </div>
  );
}
