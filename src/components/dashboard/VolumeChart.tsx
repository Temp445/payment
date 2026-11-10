"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface VolumeChartProps {
  data: Array<{ date: string; volume: number; orders: number }>;
}

export function VolumeChart({ data }: VolumeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--muted-foreground)]">
        No transaction volume recorded yet.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={[0, "auto"]}
            tickFormatter={(val) => `₹${val >= 1000 ? `${val / 1000}k` : val}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              borderColor: "#334155",
              borderRadius: "8px",
              color: "#f8fafc",
              fontSize: "12px",
            }}
            formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, "Volume"]}
          />
          <Area
            type="monotone"
            dataKey="volume"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#volumeGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

