"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface Competitor {
  name: string;
  threatScore: number;
  featureOverlap: number;
  marketPresence: number;
  pricingTier?: { low: number; high: number };
}

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981"];

export default function ThreatRadar({ competitors }: { competitors: Competitor[] }) {
  const data = [
    { metric: "Threat", ...Object.fromEntries(competitors.map((c) => [c.name, c.threatScore || 0])) },
    { metric: "Features", ...Object.fromEntries(competitors.map((c) => [c.name, c.featureOverlap || 0])) },
    { metric: "Presence", ...Object.fromEntries(competitors.map((c) => [c.name, c.marketPresence || 0])) },
    {
      metric: "Pricing",
      ...Object.fromEntries(
        competitors.map((c) => [c.name, Math.min(100, (c.pricingTier?.high || 50))])
      ),
    },
  ];

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4">
      <h3 className="text-xs font-bold uppercase text-zinc-500 mb-2">Threat Radar</h3>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#e4e4e7" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: "#52525b", fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fill: "#52525b", fontSize: 9 }} domain={[0, 100]} />
          {competitors.map((c, i) => (
            <Radar
              key={c.name}
              name={c.name}
              dataKey={c.name}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.1}
              strokeWidth={2}
            />
          ))}
          <Legend
            wrapperStyle={{ fontSize: 10, color: "#a1a1aa" }}
            iconSize={8}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e4e4e7",
              borderRadius: 8,
              fontSize: 11,
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
