"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatCompactNumber } from "@/lib/utils";

const hourFormat = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const dayHourFormat = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" });

const realtimeConfig = {
  views: { label: "Vues", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** YouTube Studio-style "realtime" bars: one bar per hour. */
export function RealtimeBars({
  data,
  dataKey = "views",
  height = 180,
}: {
  data: { hour: string; [key: string]: number | string }[];
  dataKey?: string;
  height?: number;
}) {
  return (
    <ChartContainer config={{ [dataKey]: realtimeConfig.views }} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} margin={{ left: 0, right: 0, top: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="hour"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={40}
          tickFormatter={hourFormat}
        />
        <YAxis hide />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={<ChartTooltipContent labelFormatter={(_, payload) => dayHourFormat(payload?.[0]?.payload?.hour)} />}
        />
        <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={[3, 3, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ChartContainer>
  );
}

const performanceConfig = {
  views: { label: "Vues", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Views of each recent video, highlighted when it beats the channel median. */
export function VideoPerformanceChart({
  videos,
  median,
  onSelect,
}: {
  videos: { id: string; title: string; views: number; multiplier: number | null; publishedAt: string }[];
  median: number | null;
  onSelect: (id: string) => void;
}) {
  const data = [...videos]
    .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
    .map((v) => ({
      ...v,
      date: new Date(v.publishedAt).toLocaleDateString(
        "fr-FR",
        new Date(v.publishedAt).getFullYear() === new Date().getFullYear()
          ? { day: "numeric", month: "short" }
          : { month: "short", year: "2-digit" },
      ),
    }));

  return (
    <ChartContainer config={performanceConfig} className="aspect-auto h-[260px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v: number) => formatCompactNumber(v)}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const v = payload?.[0]?.payload;
                if (!v) return "";
                return `${v.title.slice(0, 60)}${v.title.length > 60 ? "…" : ""}${v.multiplier ? ` · ${v.multiplier.toFixed(1)}x` : ""}`;
              }}
            />
          }
        />
        {median != null && (
          <ReferenceLine
            y={median}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{ value: "Médiane", position: "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" }}
          />
        )}
        <Bar
          dataKey="views"
          radius={[3, 3, 0, 0]}
          maxBarSize={22}
          className="cursor-pointer"
          onClick={(entry: { payload?: { id: string } }) => entry?.payload && onSelect(entry.payload.id)}
        >
          {data.map((v) => (
            <Cell
              key={v.id}
              fill={(v.multiplier ?? 0) >= 3 ? "#10b981" : (v.multiplier ?? 0) >= 1.5 ? "var(--chart-1)" : "#cbd5e1"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
