"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export function LeadsChart({
  data,
}: {
  data: { date: string; leads: number; previous: number }[];
}) {
  return (
    <div
      className="h-[225px] w-full min-w-0 overflow-hidden"
      role="img"
      aria-label="Gráfico de leads encontrados e comparação com o período anterior"
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 320, height: 225 }}
      >
        <AreaChart
          data={data}
          margin={{ left: -24, right: 8, top: 16, bottom: 0 }}
        >
          <defs>
            <linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.23} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 4"
          />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            minTickGap={25}
            dy={10}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontSize: 11,
              color: "var(--foreground)",
            }}
            itemStyle={{ color: "var(--foreground)" }}
            labelStyle={{ color: "var(--muted-foreground)" }}
          />
          <Area
            name="Período anterior"
            type="monotone"
            dataKey="previous"
            stroke="var(--chart-2)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="transparent"
            isAnimationActive={false}
          />
          <Area
            name="Leads encontrados"
            type="monotone"
            dataKey="leads"
            stroke="var(--chart-1)"
            strokeWidth={2.5}
            fill="url(#leadFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
