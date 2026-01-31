import React, { useEffect, useRef, useState } from "react";
import { Terminal, X, Minimize2, Maximize2, Trash2 } from "lucide-react";

export type LogEntry = {
  id: string;
  timestamp: string;
  level: "info" | "success" | "error" | "warning";
  message: string;
};

export default function LiveLogs() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  // Mock log generator (Remove this in real integration)
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      const types: LogEntry["level"][] = ["info", "success", "error", "info"];
      const msgs = [
        "Fetching Price...",
        "Tx Confirmed: 0x123",
        "Gas too high (50 gwei)",
        "Waiting for trigger...",
      ];
      const random = Math.floor(Math.random() * 4);

      addLog(types[random], msgs[random]);
    }, 3000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const addLog = (level: LogEntry["level"], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
      },
    ]);
  };

  const getColor = (level: string) => {
    switch (level) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "warning":
        return "text-amber-400";
      default:
        return "text-slate-300";
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-4 right-4 bg-slate-900 text-slate-200 px-4 py-2 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-mono hover:bg-slate-800 transition-colors z-40"
      >
        <Terminal size={14} /> Live Logs
        {logs.length > 0 && (
          <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        )}
      </button>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 w-full h-64 bg-slate-900 border-t border-slate-700 shadow-2xl z-40 flex flex-col font-mono text-xs animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 select-none">
        <div className="flex items-center gap-2 text-slate-300">
          <Terminal size={14} />
          <span className="font-bold">System Output</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLogs([])}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
            title="Clear"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Logs Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar bg-[#0f172a]"
      >
        {logs.length === 0 && (
          <div className="text-slate-600 italic">Waiting for execution...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 font-mono">
            <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
            <span className={getColor(log.level)}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
