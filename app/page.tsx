"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PipelineStatus, { type ServiceStatus } from "@/components/PipelineStatus";
import HistoryPanel from "@/components/HistoryPanel";
import ReportPanel from "@/components/ReportPanel";
import ChatPanel from "@/components/ChatPanel";

/* ─── Types ─── */
interface SSEEvent {
  step: string;
  detail?: string;
  data?: Record<string, unknown>;
}
interface StartupInfo {
  name: string;
  product: string;
  industry: string;
  keywords: string[];
  targetMarket: string;
}
interface Competitor { name: string; url: string }
interface CompetitorAnalysis {
  name: string; url: string; summary: string; pricing: string;
  recentMoves: string; hiringSignals: string; keyDifferentiator: string; threatLevel: string;
  [key: string]: unknown;
}
interface Analysis {
  competitors: CompetitorAnalysis[];
  marketIntelligence: string[];
  recommendations: string[] | { action: string; priority: "high" | "medium" | "low"; impact: string }[];
  marketOverview?: { totalAddressableMarket: string; growthTrend: "growing" | "stable" | "declining"; consolidationRisk: "high" | "medium" | "low" };
}

/* ─── Service Branding ─── */
const SERVICES: Record<string, { name: string; color: string; bg: string; border: string }> = {
  firecrawl: { name: "Firecrawl", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  claude: { name: "Claude", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
  reducto: { name: "Reducto", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  mongodb: { name: "MongoDB", color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  resend: { name: "Resend", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
};

const STEP_SERVICE: Record<string, string> = {
  scraping: "firecrawl", extracting: "claude", startup_info: "claude",
  searching: "firecrawl", ranking: "claude", competitors_found: "claude",
  deep_scraping: "firecrawl", competitor_scraping: "firecrawl",
  competitor_done: "firecrawl", pdf_parsing: "reducto", pdf_skip: "reducto",
  analyzing: "claude", analysis_ready: "claude",
  storing: "mongodb",
};

const STEP_LABELS: Record<string, string> = {
  scraping: "Scraping website", extracting: "Extracting company info",
  searching: "Searching for competitors", ranking: "Ranking top threats",
  deep_scraping: "Deep scraping competitors", analyzing: "Writing competitive brief",
  storing: "Saving to database", done: "Analysis complete",
};

const MAIN_STEPS = ["scraping", "extracting", "searching", "ranking", "deep_scraping", "analyzing", "storing"] as const;

/* ─── Service Icons (SVG) ─── */
function ServiceIcon({ service, size = 16 }: { service: string; size?: number }) {
  const s = SERVICES[service];
  if (!s) return null;
  const cls = `${s.color} flex-shrink-0`;
  if (service === "firecrawl") return (
    <svg className={cls} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8 6 4 10 4 14a8 8 0 0016 0c0-4-4-8-8-12zm0 18a6 6 0 01-6-6c0-2.5 2-5.5 6-9.5 4 4 6 7 6 9.5a6 6 0 01-6 6z"/>
      <path d="M12 20a4 4 0 01-4-4c0-2 1.5-4 4-6.5 2.5 2.5 4 4.5 4 6.5a4 4 0 01-4 4z" opacity="0.5"/>
    </svg>
  );
  if (service === "claude") return (
    <svg className={cls} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8" strokeLinecap="round"/>
    </svg>
  );
  if (service === "reducto") return (
    <svg className={cls} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
    </svg>
  );
  if (service === "mongodb") return (
    <svg className={cls} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 10a3 3 0 110-6 3 3 0 010 6z"/>
    </svg>
  );
  return null;
}

function ThreatBadge({ level }: { level: string }) {
  const c = { high: "bg-red-500/20 text-red-400 border-red-500/30", medium: "bg-amber-500/20 text-amber-400 border-amber-500/30", low: "bg-green-500/20 text-green-400 border-green-500/30" };
  return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${c[level as keyof typeof c] || c.low}`}>{level}</span>;
}

/* ─── Main Component ─── */
export default function Home() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<"input" | "running" | "done">("input");
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [startupInfo, setStartupInfo] = useState<StartupInfo | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [scrapedCompetitors, setScrapedCompetitors] = useState<Set<string>>(new Set());
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [events]);

  const completedMain = new Set(events.filter(e => (MAIN_STEPS as readonly string[]).includes(e.step)).map(e => e.step));
  const progress = phase === "done" ? 100 : (completedMain.size / MAIN_STEPS.length) * 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === "running") return;
    setPhase("running");
    setEvents([]); setStartupInfo(null); setCompetitors([]); setScrapedCompetitors(new Set()); setAnalysis(null); setAnalysisId(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startupUrl: url }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const parsed: SSEEvent = JSON.parse(line.slice(6));
          setEvents(prev => [...prev, parsed]);
          if (parsed.step === "startup_info" && parsed.data?.startup) setStartupInfo(parsed.data.startup as unknown as StartupInfo);
          if (parsed.step === "competitors_found" && parsed.data?.competitors) setCompetitors(parsed.data.competitors as unknown as Competitor[]);
          if (parsed.step === "competitor_done" && parsed.data?.name) setScrapedCompetitors(prev => new Set(prev).add(parsed.data!.name as string));
          if (parsed.step === "analysis_ready" && parsed.data?.analysis) setAnalysis(parsed.data.analysis as unknown as Analysis);
          if (parsed.step === "done") {
            setPhase("done");
            if (parsed.data?.analysisId) setAnalysisId(parsed.data.analysisId as string);
            if (parsed.data?.analysis) setAnalysis(parsed.data.analysis as unknown as Analysis);
          }
          if (parsed.step === "error") setPhase("done");
        }
      }
    } catch (err: unknown) {
      setEvents(prev => [...prev, { step: "error", detail: err instanceof Error ? err.message : "Failed" }]);
      setPhase("done");
    }
  }


  const displaySteps = events.filter(e =>
    (MAIN_STEPS as readonly string[]).includes(e.step) || e.step === "done" || e.step === "error"
  );

  /* ─── Derive pipeline statuses ─── */
  function getServiceStatus(service: string): ServiceStatus {
    const serviceEvents = events.filter(e => STEP_SERVICE[e.step] === service);
    if (serviceEvents.length === 0) return "pending";
    if (serviceEvents.some(e => e.step === "pdf_skip")) return "skip";
    const lastEvent = events[events.length - 1];
    if (phase === "running" && STEP_SERVICE[lastEvent?.step] === service) return "active";
    if (serviceEvents.length > 0) return "done";
    return "pending";
  }

  const pipelineStatuses = {
    firecrawl: getServiceStatus("firecrawl"),
    claude: getServiceStatus("claude"),
    reducto: getServiceStatus("reducto"),
    mongodb: getServiceStatus("mongodb"),
    resend: getServiceStatus("resend"),
  };

  /* ─── Load analysis from history ─── */
  const loadAnalysis = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/analysis/${id}`);
      const data = await res.json();
      if (data.error) return;
      setAnalysisId(id);
      setAnalysis({
        competitors: data.competitors,
        marketIntelligence: data.market_intelligence,
        recommendations: data.recommendations,
        marketOverview: data.market_overview,
      });
      setStartupInfo({
        name: data.startup_name,
        product: data.startup_summary || "",
        industry: "",
        keywords: [],
        targetMarket: "",
      });
      setUrl(data.startup_url || "");
      setPhase("done");
      setEvents([{ step: "done", detail: "Loaded from history" }]);
    } catch {}
  }, []);

  /* ─── History for input phase ─── */
  const [history, setHistory] = useState<{ _id: string; startup_name: string; analyzed_at: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (phase === "input") {
      setHistoryLoading(true);
      fetch("/api/history")
        .then(r => r.json())
        .then(data => setHistory(data))
        .catch(() => {})
        .finally(() => setHistoryLoading(false));
    }
  }, [phase]);

  /* ─── INPUT PHASE ─── */
  if (phase === "input") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center pb-32">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center w-full max-w-2xl px-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="url(#logo-grad)" strokeWidth="2.5" opacity="0.8"/>
              <circle cx="24" cy="24" r="14" stroke="url(#logo-grad)" strokeWidth="1.5" opacity="0.5"/>
              <line x1="24" y1="2" x2="24" y2="12" stroke="url(#logo-grad)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="24" y1="36" x2="24" y2="46" stroke="url(#logo-grad)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="2" y1="24" x2="12" y2="24" stroke="url(#logo-grad)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="36" y1="24" x2="46" y2="24" stroke="url(#logo-grad)" strokeWidth="2" strokeLinecap="round"/>
              <rect x="16" y="28" width="4" height="8" rx="1" fill="url(#logo-grad)"/>
              <rect x="22" y="22" width="4" height="14" rx="1" fill="url(#logo-grad)"/>
              <rect x="28" y="16" width="4" height="20" rx="1" fill="url(#logo-grad)"/>
              <defs><linearGradient id="logo-grad" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#fcd34d"/><stop offset="1" stopColor="#f59e0b"/></linearGradient></defs>
            </svg>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
              Competitor Intel
            </h1>
          </div>
          <p className="text-zinc-500 text-lg mb-10">Any company. Any industry. Real-time competitive analysis.</p>

          {/* Main input box with glow */}
          <form onSubmit={handleSubmit} className="relative">
            <div
              className="absolute -inset-[1px] rounded-2xl opacity-15 pointer-events-none"
              style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d4d4d8 40%, #d4d4d8 60%, #8b5cf6 100%)" }}
            />

            <div className="relative z-10 bg-white rounded-2xl p-5 shadow-lg border border-zinc-200">
              <input
                type="url" required placeholder="https://linear.app"
                value={url} onChange={e => setUrl(e.target.value)}
                className="w-full bg-transparent text-zinc-900 text-lg placeholder:text-zinc-400 focus:outline-none mb-4 px-1"
              />

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between">
                {/* Left group */}
                <div className="flex items-center gap-2">
                  {/* + button */}
                  <button type="button" className="w-8 h-8 rounded-full border border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                  {/* Normal pill */}
                  <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-500 text-sm hover:text-zinc-700 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                    Normal
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                  {/* Deep Analysis pill */}
                  <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-500 text-sm hover:text-zinc-700 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                    Deep Analysis
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                </div>

                {/* Right group */}
                <div className="flex items-center gap-2">
                  {/* Voice pill */}
                  <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-200 text-zinc-500 text-sm hover:text-zinc-700 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="6" width="4" height="12" rx="1"/><rect x="10" y="3" width="4" height="18" rx="1"/><rect x="18" y="8" width="4" height="8" rx="1"/></svg>
                    Voice
                  </button>
                  {/* Send button (purple gradient) */}
                  <motion.button
                    type="submit" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </motion.button>
                </div>
              </div>
            </div>
          </form>

          {/* Recent analyses */}
          {!historyLoading && history.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium mb-3">Recent analyses</p>
              <div className="flex flex-wrap justify-center gap-2">
                {history.slice(0, 8).map(item => (
                  <button
                    key={item._id}
                    onClick={() => loadAnalysis(item._id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 hover:border-amber-300 hover:bg-amber-50 transition-colors text-left group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover:bg-amber-500 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-zinc-700 group-hover:text-zinc-900 font-medium">{item.startup_name}</div>
                      <div className="text-[9px] text-zinc-400">{new Date(item.analyzed_at).toLocaleDateString()}</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Service logos row — pinned to bottom, uniform size */}
          <div className="fixed bottom-8 left-0 right-0 flex items-center justify-center gap-8 opacity-40">
            {/* Firecrawl */}
            <div className="flex items-center gap-1.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#a1a1aa"><path d="M12 2C8 6 4 10 4 14a8 8 0 0016 0c0-4-4-8-8-12zm0 18a6 6 0 01-6-6c0-2.5 2-5.5 6-9.5 4 4 6 7 6 9.5a6 6 0 01-6 6z"/></svg>
              <span className="text-zinc-400 text-sm font-medium">Firecrawl</span>
            </div>
            {/* Claude */}
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="#a1a1aa">
                <path d="m3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z"/>
              </svg>
              <span className="text-zinc-400 text-sm font-medium">Claude</span>
            </div>
            {/* Reducto */}
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
              <span className="text-zinc-400 text-sm font-medium">Reducto</span>
            </div>
            {/* MongoDB */}
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#a1a1aa"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 10a3 3 0 110-6 3 3 0 010 6z"/></svg>
              <span className="text-zinc-400 text-sm font-medium">MongoDB</span>
            </div>
            {/* Resend */}
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              <span className="text-zinc-400 text-sm font-medium">Resend</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ─── RUNNING / DONE PHASE: 3-Panel Layout ─── */
  return (
    <div className="h-screen bg-zinc-50 flex overflow-hidden">
      {/* Left: History Panel */}
      <div className="w-[15%] min-w-[180px] border-r border-zinc-200 bg-white p-4 flex flex-col">
        <div className="mb-4 flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="url(#sidebar-grad)" strokeWidth="2.5" opacity="0.8"/>
            <circle cx="24" cy="24" r="14" stroke="url(#sidebar-grad)" strokeWidth="1.5" opacity="0.5"/>
            <line x1="24" y1="2" x2="24" y2="12" stroke="url(#sidebar-grad)" strokeWidth="2" strokeLinecap="round"/>
            <line x1="24" y1="36" x2="24" y2="46" stroke="url(#sidebar-grad)" strokeWidth="2" strokeLinecap="round"/>
            <line x1="2" y1="24" x2="12" y2="24" stroke="url(#sidebar-grad)" strokeWidth="2" strokeLinecap="round"/>
            <line x1="36" y1="24" x2="46" y2="24" stroke="url(#sidebar-grad)" strokeWidth="2" strokeLinecap="round"/>
            <rect x="16" y="28" width="4" height="8" rx="1" fill="url(#sidebar-grad)"/>
            <rect x="22" y="22" width="4" height="14" rx="1" fill="url(#sidebar-grad)"/>
            <rect x="28" y="16" width="4" height="20" rx="1" fill="url(#sidebar-grad)"/>
            <defs><linearGradient id="sidebar-grad" x1="0" y1="0" x2="48" y2="48"><stop stopColor="#fcd34d"/><stop offset="1" stopColor="#f59e0b"/></linearGradient></defs>
          </svg>
          <h1 className="text-lg font-bold bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent">
            Competitor Intel
          </h1>
        </div>
        <HistoryPanel
          currentId={analysisId}
          onSelect={loadAnalysis}
          onNew={() => { setPhase("input"); setEvents([]); setAnalysis(null); setAnalysisId(null); }}
        />
      </div>

      {/* Center: Activity Feed or Report */}
      <div className="w-[50%] overflow-y-auto p-6 flex flex-col items-center">
        {phase === "done" && analysis && analysisId ? (
          <div className="w-full max-w-2xl">
            <ReportPanel
              analysis={analysis}
              startupName={startupInfo?.name || "Company"}
              analysisId={analysisId}
            />
          </div>
        ) : (
          <div ref={feedRef} className="w-full max-w-xl">
            {/* Pipeline status inline */}
            <PipelineStatus statuses={pipelineStatuses} />

            {/* Simple activity list */}
            <div className="mt-8 space-y-2">
              {displaySteps.map((evt, i) => {
                const serviceKey = STEP_SERVICE[evt.step] || "claude";
                const svc = SERVICES[serviceKey];
                const isActive = phase === "running" && i === displaySteps.length - 1;
                const isError = evt.step === "error";
                const isDone = evt.step === "done";

                return (
                  <motion.div
                    key={`${evt.step}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="py-3"
                  >
                    <div className="flex items-center gap-3">
                      {isActive ? (
                        <div className="w-5 h-5 flex items-center justify-center">
                          <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
                        </div>
                      ) : isError ? (
                        <div className="w-5 h-5 flex items-center justify-center text-red-500">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 flex items-center justify-center text-green-600">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12l5 5L19 7"/></svg>
                        </div>
                      )}

                      <span className={`text-sm font-semibold ${svc?.color || "text-zinc-400"}`}>{svc?.name || ""}</span>
                      <span className={`text-sm ${isActive ? "text-zinc-800 font-medium" : "text-zinc-600"}`}>
                        {STEP_LABELS[evt.step] || evt.detail || evt.step}
                      </span>
                    </div>

                    {evt.step === "ranking" && competitors.length > 0 && (
                      <div className="ml-8 mt-2 flex gap-2 flex-wrap">
                        {competitors.map((c, ci) => (
                          <motion.span key={c.name} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: ci * 0.06 }}
                            className="text-xs px-2.5 py-1 bg-zinc-100 rounded-full text-zinc-600"
                          >{c.name}</motion.span>
                        ))}
                      </div>
                    )}

                    {evt.step === "deep_scraping" && competitors.length > 0 && (
                      <div className="ml-8 mt-2 flex gap-3 flex-wrap">
                        {competitors.map(c => {
                          const scraped = scrapedCompetitors.has(c.name);
                          return (
                            <div key={c.name} className="flex items-center gap-1.5 text-sm">
                              {scraped ? <span className="text-green-600">&#10003;</span> : <div className="w-3.5 h-3.5 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />}
                              <span className={scraped ? "text-zinc-700" : "text-zinc-400"}>{c.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right: Chat Panel */}
      <div className="w-[35%] border-l border-zinc-200 bg-white p-4">
        <ChatPanel
          analysisId={analysisId}
          analysisReady={phase === "done" && !!analysis}
          startupName={startupInfo?.name}
        />
      </div>
    </div>
  );
}
