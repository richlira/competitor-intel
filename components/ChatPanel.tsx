"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "assistant" | "user";
  content: string;
}

interface ChatPanelProps {
  analysisId: string | null;
  analysisReady: boolean;
  startupName?: string;
}

export default function ChatPanel({ analysisId, analysisReady, startupName }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (analysisReady && analysisId && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `I've completed the competitive analysis for ${startupName || "this company"}. Ask me anything about the competitors, market positioning, or recommendations.`,
      }]);
    }
  }, [analysisReady, analysisId, startupName, messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !analysisId || loading) return;
    const msg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, analysisId }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="text-[10px] uppercase text-zinc-400 font-medium tracking-wider mb-3">Chat</div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.length === 0 && !analysisReady && (
          <div className="text-[11px] text-zinc-400 py-8 text-center">
            Chat will be available after analysis completes
          </div>
        )}
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xs leading-relaxed ${msg.role === "assistant" ? "text-zinc-700" : "text-zinc-500"}`}
          >
            <span className={`text-[10px] font-medium ${msg.role === "assistant" ? "text-violet-600" : "text-zinc-400"}`}>
              {msg.role === "assistant" ? "Claude" : "You"}
            </span>
            <div className="mt-0.5 prose prose-zinc prose-xs max-w-none prose-headings:text-zinc-800 prose-headings:text-xs prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-strong:text-zinc-800">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          placeholder={analysisId ? "Ask about the report..." : "Waiting for analysis..."}
          disabled={!analysisId}
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!analysisId || loading || !input.trim()}
          className="px-3 py-2 bg-violet-600 text-white text-xs rounded-lg disabled:opacity-30 hover:bg-violet-500 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
