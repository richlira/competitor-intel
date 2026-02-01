"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Competitor {
  name: string;
  pricingTier?: { low: number; high: number; model: string };
  threatLevel: string;
}

const THREAT_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

export default function PricingComparison({ competitors }: { competitors: Competitor[] }) {
  const data = competitors
    .filter((c) => c.pricingTier && (c.pricingTier.low > 0 || c.pricingTier.high > 0))
    .map((c) => ({
      name: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name,
      fullName: c.name,
      low: c.pricingTier!.low,
      high: c.pricingTier!.high,
      range: c.pricingTier!.high - c.pricingTier!.low,
      model: c.pricingTier!.model,
      level: c.threatLevel?.toLowerCase() || "low",
    }));

  if (data.length === 0) return null;

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4">
      <h3 className="text-xs font-bold uppercase text-zinc-500 mb-2">Pricing Comparison ($/mo)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
          <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#71717a", fontSize: 10 }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            width={100}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e4e4e7",
              borderRadius: 8,
              fontSize: 11,
            }}
            formatter={(value: any, name: any, props: any) => {
              if (name === "low") return [`$${value}`, "From"];
              return [`$${props.payload.low + value}`, "Up to"];
            }}
            labelFormatter={(_, payload) => {
              const d = payload?.[0]?.payload;
              return d ? `${d.fullName} (${d.model})` : "";
            }}
          />
          <Bar dataKey="low" stackId="price" fill="transparent" />
          <Bar dataKey="range" stackId="price" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={THREAT_COLOR[entry.level] || "#71717a"} fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
