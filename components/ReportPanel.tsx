"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import CompetitorCard from "./CompetitorCard";
import ThreatRadar from "./charts/ThreatRadar";
import ThreatMatrix from "./charts/ThreatMatrix";
import PricingComparison from "./charts/PricingComparison";
import MarketOverview from "./charts/MarketOverview";

interface PricingTier {
  low: number;
  high: number;
  model: string;
}

interface Recommendation {
  action: string;
  priority: "high" | "medium" | "low";
  impact: string;
}

interface MarketOverviewData {
  totalAddressableMarket: string;
  growthTrend: "growing" | "stable" | "declining";
  consolidationRisk: "high" | "medium" | "low";
}

interface CompetitorAnalysis {
  name: string;
  url: string;
  summary: string;
  pricing: string;
  pricingTier?: PricingTier;
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

interface Analysis {
  competitors: CompetitorAnalysis[];
  marketIntelligence: string[];
  recommendations: (string | Recommendation)[];
  marketOverview?: MarketOverviewData;
}

interface ReportPanelProps {
  analysis: Analysis;
  startupName: string;
  analysisId: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-50 text-red-600 border-red-200",
  medium: "bg-amber-50 text-amber-600 border-amber-200",
  low: "bg-green-50 text-green-600 border-green-200",
};

export default function ReportPanel({ analysis, startupName, analysisId }: ReportPanelProps) {
  const [exporting, setExporting] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState("");

  async function handleExportPdf() {
    setExporting(true);
    setPdfError("");
    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Export failed (${res.status})`);
      }
      const htmlString = await res.text();
      const win = window.open("", "_blank");
      if (!win) throw new Error("Pop-up blocked. Please allow pop-ups and try again.");
      win.document.write(htmlString);
      win.document.close();
      win.onafterprint = () => win.close();
      setTimeout(() => win.print(), 300);
    } catch (err: any) {
      setPdfError(err.message || "PDF export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    setEmailError("");
    try {
      const res = await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, analysisId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Send failed (${res.status})`);
      }
      setSent(true);
    } catch (err: any) {
      setEmailError(err.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  const sorted = [...analysis.competitors].sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (order[a.threatLevel?.toLowerCase()] ?? 2) -
           (order[b.threatLevel?.toLowerCase()] ?? 2);
  });

  const hasChartData = analysis.competitors.some((c) => c.threatScore != null);

  const recommendations: Recommendation[] = analysis.recommendations.map((r) =>
    typeof r === "string" ? { action: r, priority: "medium" as const, impact: "" } : r
  );

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{startupName}</h2>
          <p className="text-[11px] text-zinc-500">{analysis.competitors.length} competitors analyzed</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPdf} disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-500 text-[11px] hover:text-zinc-700 transition-colors disabled:opacity-50">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            {exporting ? "..." : "PDF"}
          </button>
          <button onClick={() => setEmailOpen(!emailOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-500 text-[11px] hover:text-zinc-700 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email
          </button>
        </div>
      </div>

      {pdfError && (
        <div className="text-xs text-red-700 p-2 bg-red-50 rounded-lg border border-red-200">{pdfError}</div>
      )}

      {/* Email form */}
      {emailOpen && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          {sent ? (
            <div className="text-xs text-green-700 p-3 bg-green-50 rounded-lg border border-green-200">Report sent via Resend with PDF attached!</div>
          ) : (
            <div className="space-y-2">
              {emailError && (
                <div className="text-xs text-red-700 p-2 bg-red-50 rounded-lg border border-red-200">{emailError}</div>
              )}
              <form onSubmit={handleSendEmail} className="flex gap-2">
                <input type="email" required placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400" />
                <button type="submit" disabled={sending}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-white font-medium text-xs rounded-lg disabled:opacity-50">
                  {sending ? "Sending..." : "Send via Resend"}
                </button>
              </form>
            </div>
          )}
        </motion.div>
      )}

      {/* Market Overview */}
      {analysis.marketOverview && (
        <MarketOverview data={analysis.marketOverview} />
      )}

      {/* Charts Dashboard */}
      {hasChartData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <ThreatRadar competitors={analysis.competitors as any} />
            <ThreatMatrix competitors={analysis.competitors as any} />
          </div>
          <PricingComparison competitors={analysis.competitors as any} />
        </motion.div>
      )}

      {/* Competitors */}
      <div className="space-y-2">
        {sorted.map((c, i) => (
          <motion.div key={c.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <CompetitorCard competitor={c as any} />
          </motion.div>
        ))}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="text-[10px] font-bold uppercase text-amber-600 mb-3">Recommendations</div>
          <div className="space-y-2.5">
            {recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className={`shrink-0 mt-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[r.priority] || PRIORITY_COLORS.medium}`}>
                  {r.priority}
                </span>
                <div className="min-w-0">
                  <div className="text-xs text-zinc-700">{r.action}</div>
                  {r.impact && <div className="text-[10px] text-zinc-400 mt-0.5">{r.impact}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Intelligence */}
      {analysis.marketIntelligence.length > 0 && (
        <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
          <div className="text-[10px] font-bold uppercase text-violet-600 mb-2">Market Intelligence</div>
          <ul className="space-y-1.5">
            {analysis.marketIntelligence.map((m, i) => (
              <li key={i} className="text-xs text-zinc-600">&#8226; {m}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
