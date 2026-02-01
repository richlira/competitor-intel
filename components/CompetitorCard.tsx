"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CompetitorAnalysis {
  name: string;
  url: string;
  summary: string;
  pricing: string;
  pricingTier?: { low: number; high: number; model: string };
  recentMoves: string;
  hiringSignals: string;
  keyDifferentiator: string;
  threatLevel: string;
  threatScore?: number;
  featureOverlap?: number;
  marketPresence?: number;
  fundingStage?: string;
  estimatedEmployees?: string;
  strengths?: string[];
  weaknesses?: string[];
}

const THREAT_COLORS = {
  high: { badge: "bg-red-50 text-red-600 border-red-200", bar: "bg-red-500" },
  medium: { badge: "bg-amber-50 text-amber-600 border-amber-200", bar: "bg-amber-500" },
  low: { badge: "bg-green-50 text-green-600 border-green-200", bar: "bg-green-500" },
};

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-zinc-400 w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-[9px] text-zinc-400 w-6 text-right">{value}</span>
    </div>
  );
}

export default function CompetitorCard({ competitor }: { competitor: CompetitorAnalysis }) {
  const [open, setOpen] = useState(false);
  const level = (competitor.threatLevel?.toLowerCase() || "low") as keyof typeof THREAT_COLORS;
  const colors = THREAT_COLORS[level] || THREAT_COLORS.low;

  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-zinc-50 transition-colors"
      >
        <div className={`w-1 h-8 rounded-full ${colors.bar}`} />
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-medium text-zinc-800">{competitor.name}</div>
          <div className="text-[11px] text-zinc-500 truncate">{competitor.pricing}</div>
        </div>
        {competitor.threatScore != null && (
          <span className="text-[10px] font-mono text-zinc-400">{competitor.threatScore}</span>
        )}
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${colors.badge}`}>
          {competitor.threatLevel}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-zinc-100 pt-3">
              {/* Score bars */}
              {competitor.threatScore != null && (
                <div className="space-y-1.5">
                  <ScoreBar label="Threat" value={competitor.threatScore} color="bg-red-400" />
                  <ScoreBar label="Features" value={competitor.featureOverlap || 0} color="bg-blue-400" />
                  <ScoreBar label="Presence" value={competitor.marketPresence || 0} color="bg-violet-400" />
                </div>
              )}

              {/* Meta pills */}
              <div className="flex flex-wrap gap-1.5">
                {competitor.fundingStage && competitor.fundingStage !== "Unknown" && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-500 border border-zinc-200">
                    {competitor.fundingStage}
                  </span>
                )}
                {competitor.estimatedEmployees && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-500 border border-zinc-200">
                    {competitor.estimatedEmployees} employees
                  </span>
                )}
                {competitor.pricingTier?.model && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-500 border border-zinc-200">
                    {competitor.pricingTier.model}
                  </span>
                )}
              </div>

              <div className="text-xs text-zinc-600">{competitor.summary}</div>

              {/* Strengths & Weaknesses */}
              {(competitor.strengths?.length || competitor.weaknesses?.length) ? (
                <div className="grid grid-cols-2 gap-3">
                  {competitor.strengths && competitor.strengths.length > 0 && (
                    <div>
                      <div className="text-[9px] uppercase text-green-600/70 mb-1">Strengths</div>
                      {competitor.strengths.map((s, i) => (
                        <div key={i} className="text-[11px] text-zinc-600 flex items-start gap-1">
                          <span className="text-green-500 mt-0.5">+</span> {s}
                        </div>
                      ))}
                    </div>
                  )}
                  {competitor.weaknesses && competitor.weaknesses.length > 0 && (
                    <div>
                      <div className="text-[9px] uppercase text-red-600/70 mb-1">Weaknesses</div>
                      {competitor.weaknesses.map((w, i) => (
                        <div key={i} className="text-[11px] text-zinc-600 flex items-start gap-1">
                          <span className="text-red-500 mt-0.5">&minus;</span> {w}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <InfoBlock label="Pricing" value={competitor.pricing} />
                <InfoBlock label="Differentiator" value={competitor.keyDifferentiator} />
                <InfoBlock label="Hiring Signals" value={competitor.hiringSignals} />
                <InfoBlock label="Recent Moves" value={competitor.recentMoves} />
              </div>
              {competitor.url && (
                <a href={competitor.url} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors">
                  {competitor.url} ↗
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase text-zinc-400 mb-0.5">{label}</div>
      <div className="text-[11px] text-zinc-600">{value}</div>
    </div>
  );
}
