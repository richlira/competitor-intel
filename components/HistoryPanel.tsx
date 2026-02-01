"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface HistoryItem {
  _id: string;
  startup_name: string;
  analyzed_at: string;
}

interface HistoryPanelProps {
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export default function HistoryPanel({ currentId, onSelect, onNew }: HistoryPanelProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetch("/api/history")
      .then(r => r.json())
      .then(data => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentId]);

  const handleClear = async () => {
    if (!confirm("Clear all analysis history?")) return;
    setClearing(true);
    try {
      await fetch("/api/history", { method: "DELETE" });
      setItems([]);
      onNew();
    } catch {}
    setClearing(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase text-zinc-400 font-medium tracking-wider">History</span>
        <div className="flex gap-1.5">
          {items.length > 0 && (
            <button
              onClick={handleClear}
              disabled={clearing}
              className="text-[10px] px-2.5 py-1 rounded-md bg-white border border-zinc-200 text-red-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              {clearing ? "..." : "Clear"}
            </button>
          )}
          <button
            onClick={onNew}
            className="text-[10px] px-2.5 py-1 rounded-md bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            + New
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {loading && (
          <div className="text-[11px] text-zinc-400 py-4 text-center">Loading...</div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-[11px] text-zinc-400 py-4 text-center">No analyses yet</div>
        )}
        {items.map(item => (
          <motion.button
            key={item._id}
            onClick={() => onSelect(item._id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2 ${
              currentId === item._id
                ? "bg-amber-50 border border-amber-200"
                : "hover:bg-zinc-50 border border-transparent"
            }`}
            whileHover={{ x: 2 }}
          >
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                currentId === item._id ? "bg-amber-500" : "border border-zinc-300"
              }`}
            />
            <div className="min-w-0">
              <div className={`text-xs truncate ${currentId === item._id ? "text-zinc-800" : "text-zinc-600"}`}>
                {item.startup_name}
              </div>
              <div className="text-[9px] text-zinc-400">
                {new Date(item.analyzed_at).toLocaleDateString()}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
