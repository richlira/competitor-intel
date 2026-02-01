"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Competitor {
  name: string;
  threatScore: number;
  featureOverlap: number;
  marketPresence: number;
  threatLevel: string;
}

const THREAT_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

export default function ThreatMatrix({ competitors }: { competitors: Competitor[] }) {
  const data = competitors.map((c) => ({
    x: c.featureOverlap || 0,
    y: c.marketPresence || 0,
    z: c.threatScore || 50,
    name: c.name,
    level: c.threatLevel?.toLowerCase() || "low",
  }));

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4">
      <h3 className="text-xs font-bold uppercase text-zinc-500 mb-2">Threat Matrix</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
          <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 100]}
            name="Feature Overlap"
            tick={{ fill: "#71717a", fontSize: 10 }}
            label={{ value: "Feature Overlap %", position: "bottom", fill: "#52525b", fontSize: 10 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 100]}
            name="Market Presence"
            tick={{ fill: "#71717a", fontSize: 10 }}
            label={{ value: "Market Presence", angle: -90, position: "insideLeft", fill: "#52525b", fontSize: 10 }}
          />
          <ZAxis type="number" dataKey="z" range={[100, 600]} name="Threat Score" />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e4e4e7",
              borderRadius: 8,
              fontSize: 11,
            }}
            formatter={(value: any, name: any) => {
              if (name === "Feature Overlap") return [`${value}%`, name];
              if (name === "Market Presence") return [`${value}%`, name];
              return [value, name];
            }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
          />
          <Scatter data={data}>
            {data.map((entry, i) => (
              <Cell key={i} fill={THREAT_COLOR[entry.level] || "#71717a"} fillOpacity={0.8} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
