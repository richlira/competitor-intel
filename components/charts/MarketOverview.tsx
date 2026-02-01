"use client";

import { motion } from "framer-motion";

interface MarketOverviewData {
  totalAddressableMarket: string;
  growthTrend: "growing" | "stable" | "declining";
  consolidationRisk: "high" | "medium" | "low";
}

const TREND_CONFIG = {
  growing: { icon: "↑", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  stable: { icon: "→", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  declining: { icon: "↓", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

const RISK_CONFIG = {
  high: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  medium: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  low: { color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
};

export default function MarketOverview({ data }: { data: MarketOverviewData }) {
  const trend = TREND_CONFIG[data.growthTrend] || TREND_CONFIG.stable;
  const risk = RISK_CONFIG[data.consolidationRisk] || RISK_CONFIG.medium;

  return (
    <div className="grid grid-cols-3 gap-3">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-zinc-200 rounded-xl p-4"
      >
        <div className="text-[9px] uppercase text-zinc-600 mb-1">Total Addressable Market</div>
        <div className="text-sm font-semibold text-zinc-900">{data.totalAddressableMarket}</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`rounded-xl p-4 border ${trend.bg}`}
      >
        <div className="text-[9px] uppercase text-zinc-600 mb-1">Growth Trend</div>
        <div className={`text-sm font-semibold ${trend.color} flex items-center gap-1.5`}>
          <span className="text-lg">{trend.icon}</span>
          {data.growthTrend.charAt(0).toUpperCase() + data.growthTrend.slice(1)}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`rounded-xl p-4 border ${risk.bg}`}
      >
        <div className="text-[9px] uppercase text-zinc-600 mb-1">Consolidation Risk</div>
        <div className={`text-sm font-semibold ${risk.color}`}>
          {data.consolidationRisk.charAt(0).toUpperCase() + data.consolidationRisk.slice(1)}
        </div>
      </motion.div>
    </div>
  );
}
