import React, { useState, useEffect } from "react";
import { ExternalLink, Check, X, Loader2, Terminal, Copy } from "lucide-react";
import { toast } from "sonner";

export default function NodeExecutionStatus({ nodeId, executionData }: any) {
  // 1. Default to CLOSED
  const [isOpen, setIsOpen] = useState(false);

  // 2. Smart Auto-Open Logic
  useEffect(() => {
    if (!executionData) return;

    const { status, result } = executionData;
    const hasTxHash = !!result?.TX_HASH;

    // Auto-open ONLY if it failed OR if it generated a Transaction Hash
    if (status === "failed" || hasTxHash) {
      setIsOpen(true);
    } else {
      // Keep it closed for 'running' or normal 'success' without a hash
      setIsOpen(false);
    }
  }, [executionData]); // Only re-runs when the node updates its execution state

  if (!executionData) return null;

  const { status, result, error } = executionData;
  const link = result?.EXPLORER_LINK;
  const hash = result?.TX_HASH;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!result && !error) return;

    const textToCopy = error ? error : JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(textToCopy);
    toast.success(
      error ? "Error details copied" : "Result copied to clipboard",
    );
  };

  // --- MINIMIZED (CLOSED) STATE ---
  if (!isOpen) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true); // User manually opens it by clicking the badge
        }}
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 cursor-pointer group animate-in fade-in zoom-in duration-200"
        title="View Execution Details"
      >
        <div
          className={`
            flex items-center justify-center w-6 h-6 rounded-full shadow-md border border-slate-200 bg-white
            hover:scale-110 transition-transform
            ${status === "running" ? "ring-2 ring-amber-400/50" : ""}
            ${status === "success" ? "ring-2 ring-emerald-400/50" : ""}
            ${status === "failed" ? "ring-2 ring-rose-400/50" : ""}
          `}
        >
          {status === "running" && (
            <Loader2 size={12} className="text-amber-500 animate-spin" />
          )}
          {status === "success" && (
            <Check size={12} strokeWidth={3} className="text-emerald-500" />
          )}
          {status === "failed" && (
            <X size={12} strokeWidth={3} className="text-rose-500" />
          )}
        </div>
      </div>
    );
  }

  // --- OPEN STATE ---
  return (
    <div
      className="
        absolute bottom-full left-1/2 -translate-x-1/2 mb-3 
        w-72 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 
        flex flex-col z-50 
        animate-in fade-in slide-in-from-bottom-3 duration-300 ease-out origin-bottom
      "
      onClick={(e) => e.stopPropagation()}
    >
      {/* --- HEADER --- */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-sm rounded-t-xl z-10">
        <div className="flex items-center gap-2">
          {/* Status Icon Pill */}
          <div
            className={`
            flex items-center justify-center w-5 h-5 rounded-full
            ${status === "running" ? "bg-amber-100 text-amber-600 animate-pulse" : ""}
            ${status === "success" ? "bg-emerald-100 text-emerald-600" : ""}
            ${status === "failed" ? "bg-rose-100 text-rose-600" : ""}
          `}
          >
            {status === "running" && (
              <Loader2 size={10} className="animate-spin" />
            )}
            {status === "success" && <Check size={10} strokeWidth={3} />}
            {status === "failed" && <X size={10} strokeWidth={3} />}
          </div>

          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            {status === "running" ? "Processing" : status}
          </span>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1">
          {/* Copy Action */}
          {(status === "success" || status === "failed") && (
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-indigo-600 transition-colors p-1 hover:bg-slate-50 rounded"
              title="Copy output"
            >
              <Copy size={12} />
            </button>
          )}

          {/* Close Action */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 hover:bg-slate-50 rounded"
            title="Close details"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* --- CONTENT BODY --- */}
      <div className="p-1 bg-white/95 backdrop-blur-sm rounded-b-xl z-10 relative">
        {status === "failed" ? (
          <div className="m-2 p-3 bg-rose-50 border border-rose-100 rounded-lg font-mono text-[10px]">
            <p className="font-bold text-rose-800 mb-1 uppercase tracking-wider">
              Error Output
            </p>
            <p className="text-rose-600 leading-relaxed break-words whitespace-pre-wrap">
              {error || "Unknown error occurred."}
            </p>
          </div>
        ) : link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="group block m-2 p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 rounded-lg transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-500 group-hover:text-indigo-600 uppercase tracking-wider">
                Explorer Link
              </span>
              <ExternalLink
                size={10}
                className="text-slate-300 group-hover:text-indigo-500 transition-colors"
              />
            </div>
            <div className="text-xs font-mono text-slate-700 truncate">
              {hash ? `${hash.substring(0, 20)}...` : "View Transaction"}
            </div>
          </a>
        ) : result ? (
          <div className="relative group/code m-2">
            <div className="absolute top-2 right-2 z-20 opacity-50 group-hover/code:opacity-100 transition-opacity pointer-events-none">
              <Terminal size={10} className="text-slate-400" />
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar p-3 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg text-[10px] font-mono leading-relaxed shadow-sm">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center py-6">
            <span className="text-[10px] text-slate-400 italic flex items-center justify-center gap-2">
              {status === "running" ? (
                <Loader2 size={12} className="animate-spin" />
              ) : null}
              Waiting for output...
            </span>
          </div>
        )}
      </div>

      <div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-slate-100 transform rotate-45 z-0 shadow-[2px_2px_4px_-1px_rgba(0,0,0,0.05)]"></div>
    </div>
  );
}
