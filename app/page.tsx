"use client";

import { useState, useRef } from "react";

interface Step {
  step: string;
  detail?: string;
}

const STEP_LABELS: Record<string, string> = {
  scraping: "Scraping startup",
  extracting: "Analyzing startup",
  searching: "Finding competitors",
  ranking: "Ranking competitors",
  deep_scraping: "Deep scraping competitors",
  analyzing: "Generating analysis",
  storing: "Saving to database",
  emailing: "Sending report",
  done: "Complete",
  error: "Error",
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (running) return;
    setRunning(true);
    setSteps([]);
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
          if (line.startsWith("data: ")) {
            const parsed: Step = JSON.parse(line.slice(6));
            setSteps((prev) => [...prev, parsed]);
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setSteps((prev) => [...prev, { step: "error", detail: err instanceof Error ? err.message : "Failed" }]);
      }
    } finally {
      setRunning(false);
    }
  }

  const isDone = steps.some((s) => s.step === "done");
  const hasError = steps.some((s) => s.step === "error");

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-2">Competitor Intel</h1>
        <p className="text-zinc-400 mb-8">
          Paste a startup URL, get a competitive intelligence report in your inbox.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <input
            type="url"
            required
            placeholder="https://linear.app"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
            disabled={running}
          />
          <input
            type="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
            disabled={running}
          />
          <button
            type="submit"
            disabled={running}
            className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? "Analyzing..." : "Analyze Competitors"}
          </button>
        </form>

        {steps.length > 0 && (
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 text-sm ${
                  s.step === "error"
                    ? "text-red-400"
                    : s.step === "done"
                    ? "text-green-400"
                    : "text-zinc-400"
                }`}
              >
                <span className="mt-0.5">
                  {s.step === "done"
                    ? "\u2713"
                    : s.step === "error"
                    ? "\u2717"
                    : i === steps.length - 1 && running
                    ? "\u25CB"
                    : "\u2713"}
                </span>
                <div>
                  <span className="font-medium text-zinc-200">
                    {STEP_LABELS[s.step] || s.step}
                  </span>
                  {s.detail && (
                    <p className="text-zinc-500 mt-0.5">{s.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {isDone && (
          <div className="mt-6 p-4 bg-green-950/50 border border-green-900 rounded-lg text-green-300 text-sm">
            Report sent! Check your inbox.
          </div>
        )}
        {hasError && (
          <div className="mt-6 p-4 bg-red-950/50 border border-red-900 rounded-lg text-red-300 text-sm">
            Something went wrong. Check the details above.
          </div>
        )}
      </div>
    </div>
  );
}
