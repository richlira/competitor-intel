"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

interface Competitor {
  name: string;
  url: string;
}

interface CompetitorAnalysis {
  name: string;
  url: string;
  summary: string;
  pricing: string;
  recentMoves: string;
  hiringSignals: string;
  keyDifferentiator: string;
  threatLevel: string;
}

interface Analysis {
  competitors: CompetitorAnalysis[];
  marketIntelligence: string[];
  recommendations: string[];
}

const STEPS = [
  "scraping",
  "extracting",
  "searching",
  "ranking",
  "deep_scraping",
  "analyzing",
  "storing",
  "emailing",
] as const;

const STEP_META: Record<
  string,
  { label: string; icon: string; description: string }
> = {
  scraping: {
    label: "Scraping startup",
    icon: "globe",
    description: "Fetching website content with Firecrawl",
  },
  extracting: {
    label: "Analyzing startup",
    icon: "brain",
    description: "Claude is extracting product & industry info",
  },
  startup_info: { label: "Startup identified", icon: "check", description: "" },
  searching: {
    label: "Searching for competitors",
    icon: "search",
    description: "Running 3 parallel searches via Firecrawl",
  },
  ranking: {
    label: "Ranking competitors",
    icon: "trophy",
    description: "Claude is picking the top 5 threats",
  },
  competitors_found: { label: "Competitors identified", icon: "users", description: "" },
  deep_scraping: {
    label: "Deep scraping competitors",
    icon: "layers",
    description: "Scraping pricing, about, careers for each",
  },
  competitor_scraping: { label: "Scraping", icon: "download", description: "" },
  competitor_done: { label: "Scraped", icon: "check", description: "" },
  analyzing: {
    label: "Generating analysis",
    icon: "sparkles",
    description: "Claude is writing the competitive brief",
  },
  analysis_ready: { label: "Analysis complete", icon: "check", description: "" },
  storing: {
    label: "Saving to database",
    icon: "database",
    description: "Storing snapshot in MongoDB",
  },
  emailing: {
    label: "Sending report",
    icon: "mail",
    description: "Delivering via Resend",
  },
  done: { label: "Complete", icon: "check", description: "" },
  error: { label: "Error", icon: "alert", description: "" },
};

function Icon({ name, className }: { name: string; className?: string }) {
  const icons: Record<string, string> = {
    globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 014 9 15 15 0 01-4 9 15 15 0 01-4-9 15 15 0 014-9z",
    brain: "M12 2a7 7 0 00-5.2 2.3A6.5 6.5 0 003 10c0 2.5 1.4 4.7 3.5 5.8A5.5 5.5 0 0012 22a5.5 5.5 0 005.5-6.2A6.5 6.5 0 0021 10a6.5 6.5 0 00-3.8-5.7A7 7 0 0012 2z",
    search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    trophy: "M6 9H4.5a2.5 2.5 0 010-5H6m12 5h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22m10 0c0-1.76-.85-3.25-2.03-3.79-.5-.23-.97-.66-.97-1.21v-2.34m-4-2.17l-.13.01C8.7 12.64 8 11.38 8 10V5c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v5c0 1.38-.7 2.64-1.87 2.5L14 12.49",
    users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
    layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4-5l5 5 5-5m-5 5V3",
    sparkles: "M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z",
    database: "M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2zM2 11.5c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5",
    mail: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    check: "M20 6L9 17l-5-5",
    alert: "M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  };
  return (
    <svg
      className={className || "w-4 h-4"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={icons[name] || icons.check} />
    </svg>
  );
}

function Spinner() {
  return (
    <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
  );
}

function ThreatBadge({ level }: { level: string }) {
  const colors = {
    high: "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return (
    <span
      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
        colors[level as keyof typeof colors] || colors.low
      }`}
    >
      {level}
    </span>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [startupInfo, setStartupInfo] = useState<StartupInfo | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [scrapedCompetitors, setScrapedCompetitors] = useState<Set<string>>(new Set());
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const mainStepsCompleted = new Set(
    events.filter((e) => STEPS.includes(e.step as (typeof STEPS)[number])).map((e) => e.step)
  );
  const progress = (mainStepsCompleted.size / STEPS.length) * 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (running) return;
    setRunning(true);
    setEvents([]);
    setStartupInfo(null);
    setCompetitors([]);
    setScrapedCompetitors(new Set());
    setAnalysis(null);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startupUrl: url, email }),
        signal: abortRef.current.signal,
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
          setEvents((prev) => [...prev, parsed]);

          if (parsed.step === "startup_info" && parsed.data?.startup) {
            setStartupInfo(parsed.data.startup as unknown as StartupInfo);
          }
          if (parsed.step === "competitors_found" && parsed.data?.competitors) {
            setCompetitors(parsed.data.competitors as unknown as Competitor[]);
          }
          if (parsed.step === "competitor_done" && parsed.data?.name) {
            setScrapedCompetitors((prev) => new Set(prev).add(parsed.data!.name as string));
          }
          if (parsed.step === "analysis_ready" && parsed.data?.analysis) {
            setAnalysis(parsed.data.analysis as unknown as Analysis);
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setEvents((prev) => [
          ...prev,
          { step: "error", detail: err instanceof Error ? err.message : "Failed" },
        ]);
      }
    } finally {
      setRunning(false);
    }
  }

  const isDone = events.some((s) => s.step === "done");
  const hasError = events.some((s) => s.step === "error");
  const currentStep = events.length > 0 ? events[events.length - 1].step : null;

  // Deduplicate: show only main pipeline steps + special data events
  const displaySteps = events.filter(
    (e) =>
      STEPS.includes(e.step as (typeof STEPS)[number]) ||
      e.step === "done" ||
      e.step === "error"
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl font-bold tracking-tight">Competitor Intel</h1>
          <p className="text-zinc-500 mt-2 text-lg">
            Paste a startup URL, get a competitive intelligence report in your inbox.
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-3 mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <input
            type="url"
            required
            placeholder="https://linear.app"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 placeholder:text-zinc-600 transition-all"
            disabled={running}
          />
          <input
            type="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 placeholder:text-zinc-600 transition-all"
            disabled={running}
          />
          <button
            type="submit"
            disabled={running}
            className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {running ? "Analyzing..." : "Analyze Competitors"}
          </button>
        </motion.form>

        {/* Progress Bar */}
        <AnimatePresence>
          {running && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0 }}
              className="mb-8"
            >
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Steps */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {displaySteps.map((evt, i) => {
              const meta = STEP_META[evt.step] || {
                label: evt.step,
                icon: "check",
                description: "",
              };
              const isActive =
                running && i === displaySteps.length - 1 && evt.step !== "done";
              const isError = evt.step === "error";
              const isDoneStep = evt.step === "done";

              return (
                <motion.div
                  key={`${evt.step}-${i}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`rounded-xl border p-4 ${
                    isError
                      ? "border-red-800 bg-red-950/30"
                      : isDoneStep
                      ? "border-green-800 bg-green-950/30"
                      : isActive
                      ? "border-blue-800 bg-blue-950/20"
                      : "border-zinc-800/50 bg-zinc-900/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex-shrink-0 ${
                        isError
                          ? "text-red-400"
                          : isDoneStep
                          ? "text-green-400"
                          : isActive
                          ? "text-blue-400"
                          : "text-zinc-500"
                      }`}
                    >
                      {isActive ? <Spinner /> : <Icon name={meta.icon} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium text-sm ${
                            isError
                              ? "text-red-300"
                              : isDoneStep
                              ? "text-green-300"
                              : isActive
                              ? "text-blue-200"
                              : "text-zinc-300"
                          }`}
                        >
                          {meta.label}
                        </span>
                        {!isActive && !isError && !isDoneStep && (
                          <span className="text-green-500 text-xs">done</span>
                        )}
                      </div>
                      {(isActive ? meta.description : evt.detail) && (
                        <p className="text-zinc-500 text-xs mt-0.5 truncate">
                          {isActive ? meta.description : evt.detail}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Inline: Startup Info Card */}
                  {evt.step === "extracting" && startupInfo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                    >
                      <div className="text-sm font-semibold text-white">
                        {startupInfo.name}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        {startupInfo.product}
                      </div>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 bg-zinc-700/50 rounded-full text-zinc-300">
                          {startupInfo.industry}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-zinc-700/50 rounded-full text-zinc-300">
                          {startupInfo.targetMarket}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {/* Inline: Competitor Chips */}
                  {evt.step === "ranking" && competitors.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 flex gap-2 flex-wrap"
                    >
                      {competitors.map((c, ci) => (
                        <motion.span
                          key={c.name}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: ci * 0.1 }}
                          className="text-xs px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-200"
                        >
                          {c.name}
                        </motion.span>
                      ))}
                    </motion.div>
                  )}

                  {/* Inline: Per-Competitor Scrape Progress */}
                  {evt.step === "deep_scraping" && competitors.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 flex gap-3 flex-wrap"
                    >
                      {competitors.map((c) => {
                        const done = scrapedCompetitors.has(c.name);
                        return (
                          <div
                            key={c.name}
                            className="flex items-center gap-1.5 text-xs"
                          >
                            {done ? (
                              <span className="text-green-400 text-[10px]">&#10003;</span>
                            ) : (
                              <div className="w-3 h-3 border border-zinc-600/50 border-t-zinc-400 rounded-full animate-spin" />
                            )}
                            <span
                              className={
                                done ? "text-zinc-300" : "text-zinc-500"
                              }
                            >
                              {c.name}
                            </span>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}

                  {/* Inline: Analysis Preview */}
                  {evt.step === "analyzing" && analysis && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 space-y-2"
                    >
                      {analysis.competitors.map((c, ci) => (
                        <motion.div
                          key={c.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: ci * 0.08 }}
                          className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/30"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium text-zinc-200 truncate">
                              {c.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <ThreatBadge level={c.threatLevel} />
                          </div>
                        </motion.div>
                      ))}

                      {analysis.recommendations.length > 0 && (
                        <div className="mt-2 p-2 bg-blue-950/30 border border-blue-900/30 rounded-lg">
                          <div className="text-[10px] font-bold uppercase text-blue-400 mb-1">
                            Top Recommendation
                          </div>
                          <div className="text-xs text-zinc-300">
                            {analysis.recommendations[0]}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Final Success */}
        <AnimatePresence>
          {isDone && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-5 bg-green-950/30 border border-green-800 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Icon name="check" className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <div className="font-medium text-green-300">Report sent!</div>
                  <div className="text-xs text-green-500/70">
                    Check your inbox for the full competitive intelligence brief.
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {hasError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-5 bg-red-950/30 border border-red-800 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <Icon name="alert" className="w-5 h-5 text-red-400" />
                <div className="text-sm text-red-300">
                  {events.find((e) => e.step === "error")?.detail || "Something went wrong"}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
