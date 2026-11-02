"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RankedObservation } from "@/lib/mannWhitney";
import { fmt } from "@/lib/mannWhitney";

const COLOR_1 = "#0b2545";
const COLOR_2 = "#8db4e2";

export default function RankChart({
  ranked,
  name1,
  name2,
}: {
  ranked: RankedObservation[];
  name1: string;
  name2: string;
}) {
  const data = ranked.map((o) => ({
    label: fmt(o.value, 10),
    rank: o.rank,
    group: o.group,
    name: o.group === 1 ? name1 : name2,
  }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-sm text-navy-900">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ background: COLOR_1 }} /> Group 1 · {name1}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ background: COLOR_2 }} /> Group 2 · {name2}
        </span>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2ebf6" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#13315c" }}
              interval={data.length > 30 ? "preserveStartEnd" : 0}
              tickLine={false}
              axisLine={{ stroke: "#cfe0f5" }}
              label={{ value: "Score (ascending)", position: "insideBottom", offset: -4, fill: "#475569", fontSize: 12 }}
              height={40}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#13315c" }}
              tickLine={false}
              axisLine={false}
              width={40}
              label={{ value: "Rank", angle: -90, position: "insideLeft", fill: "#475569", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "#eef5fd" }}
              formatter={(value) => [fmt(Number(value)), "Rank"]}
              labelFormatter={(label, payload) => {
                const p = payload?.[0]?.payload as { name?: string; group?: number } | undefined;
                return p ? `Score ${label} · Group ${p.group} (${p.name})` : `Score ${label}`;
              }}
              contentStyle={{ borderRadius: 10, borderColor: "#cfe0f5" }}
            />
            <Bar dataKey="rank" radius={[4, 4, 0, 0]} isAnimationActive>
              {data.map((d, i) => (
                <Cell key={i} fill={d.group === 1 ? COLOR_1 : COLOR_2} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
