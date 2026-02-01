"use client";

import { motion } from "framer-motion";

export type ServiceStatus = "pending" | "active" | "done" | "skip";

interface PipelineStatusProps {
  statuses: {
    firecrawl: ServiceStatus;
    claude: ServiceStatus;
    reducto: ServiceStatus;
    mongodb: ServiceStatus;
    resend: ServiceStatus;
  };
}

const SERVICES = [
  { key: "firecrawl", label: "Firecrawl", icon: "fire" },
  { key: "claude", label: "Claude", icon: "brain" },
  { key: "reducto", label: "Reducto", icon: "doc" },
  { key: "mongodb", label: "MongoDB", icon: "db" },
  { key: "resend", label: "Resend", icon: "mail" },
] as const;

function ServiceLogo({ icon, active }: { icon: string; active: boolean }) {
  const cls = active ? "text-zinc-700" : "text-zinc-400";
  if (icon === "fire")
    return (
      <svg className={cls} width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8 6 4 10 4 14a8 8 0 0016 0c0-4-4-8-8-12zm0 18a6 6 0 01-6-6c0-2.5 2-5.5 6-9.5 4 4 6 7 6 9.5a6 6 0 01-6 6z" />
      </svg>
    );
  if (icon === "brain")
    return (
      <svg className={cls} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12h8M12 8v8" strokeLinecap="round" />
      </svg>
    );
  if (icon === "doc")
    return (
      <svg className={cls} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    );
  if (icon === "db")
    return (
      <svg className={cls} width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 10a3 3 0 110-6 3 3 0 010 6z" />
      </svg>
    );
  return (
    <svg className={cls} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function StatusDot({ status }: { status: ServiceStatus }) {
  if (status === "done")
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round">
        <path d="M5 12l5 5L19 7" />
      </svg>
    );
  if (status === "active")
    return <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />;
  if (status === "skip")
    return <span className="text-[9px] text-zinc-400">skip</span>;
  return <div className="w-2.5 h-2.5 border border-zinc-300 rounded-full" />;
}

export default function PipelineStatus({ statuses }: PipelineStatusProps) {
  return (
    <div className="flex items-center gap-2">
      {SERVICES.map((svc, i) => {
        const status = statuses[svc.key as keyof typeof statuses];
        const isActive = status === "active" || status === "done";
        return (
          <div key={svc.key} className="flex items-center gap-2">
            <motion.div
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border ${
                status === "active"
                  ? "border-amber-200 bg-amber-50"
                  : status === "done"
                  ? "border-green-200 bg-green-50"
                  : "border-zinc-200 bg-white"
              }`}
              animate={status === "active" ? { boxShadow: ["0 0 0px rgba(245,158,11,0)", "0 0 12px rgba(245,158,11,0.15)", "0 0 0px rgba(245,158,11,0)"] } : {}}
              transition={status === "active" ? { duration: 2, repeat: Infinity } : {}}
            >
              <ServiceLogo icon={svc.icon} active={isActive} />
              <span className={`text-[11px] font-medium ${isActive ? "text-zinc-700" : "text-zinc-400"}`}>
                {svc.label}
              </span>
              <StatusDot status={status} />
            </motion.div>
            {i < SERVICES.length - 1 && (
              <svg width="20" height="10" viewBox="0 0 24 12" className={isActive ? "text-zinc-400" : "text-zinc-300"}>
                <path d="M0 6h20M16 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}
