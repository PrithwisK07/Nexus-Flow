import React, { useState, useEffect } from "react";
import {
  X,
  Activity,
  Trash2,
  Loader2,
  CalendarClock,
  Repeat,
  Zap,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

// --- Sub-component for the live countdown ---
const ScheduleCountdown = ({ targetTime }: { targetTime: number }) => {
  const [timeLeft, setTimeLeft] = useState<string>("...");

  useEffect(() => {
    if (!targetTime || isNaN(targetTime)) {
      setTimeLeft("");
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft("Running shortly...");
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);

      if (d > 0) {
        setTimeLeft(`in ${d}d ${h}h`);
      } else if (h > 0) {
        setTimeLeft(`in ${h}h ${m}m`);
      } else {
        setTimeLeft(`in ${m}m ${s}s`);
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [targetTime]);

  if (!timeLeft) return null;

  return (
    <span className="text-sm font-semibold text-slate-900 tracking-tight animate-in fade-in">
      {timeLeft}
    </span>
  );
};

// --- Main Modal Component ---
export default function ActiveSchedulesModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSchedules();
    }
  }, [isOpen]);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:3001/schedules");
      const data = await res.json();
      if (data.success) {
        setSchedules(data.jobs);
      }
    } catch (error) {
      toast.error("Failed to load active schedules");
    } finally {
      setIsLoading(false);
    }
  };

  const stopSchedule = async (key: string) => {
    try {
      const res = await fetch(
        `http://localhost:3001/schedules/${encodeURIComponent(key)}`,
        { method: "DELETE" },
      );
      const data = await res.json();

      if (data.success) {
        toast.success("Schedule stopped successfully");
        setSchedules((prev) => prev.filter((job) => job.key !== key));
      } else {
        toast.error(data.error || "Failed to stop schedule");
      }
    } catch (error) {
      toast.error("Network error while stopping schedule");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-[700px] max-w-[95vw] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200/60">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-10 h-10 bg-white text-indigo-600 rounded-xl border border-slate-200 shadow-sm">
              <Activity size={20} className="text-indigo-500" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                Active Workflows
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Monitoring background automated tasks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* List Body */}
        <div className="p-6 overflow-y-auto max-h-[65vh] bg-white">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2
                size={24}
                className="animate-spin text-indigo-500 mb-3"
              />
              <span className="text-sm">Loading active schedules...</span>
            </div>
          ) : schedules.length === 0 ? (
            <div className="flex flex-col items-center text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <div className="w-12 h-12 bg-white text-slate-300 rounded-xl flex items-center justify-center mb-3 shadow-sm border border-slate-100">
                <Timer size={24} />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">
                No active schedules
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-xs">
                Deploy a workflow using a Timer trigger to see it running here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((job) => (
                <div
                  key={job.key}
                  className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-200"
                >
                  {/* Left Side: Identity */}
                  <div className="flex items-center gap-4 min-w-0 mb-4 sm:mb-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                      <Zap size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {/* Fallback to 'Automated Task' if name isn't clearly defined */}
                        {job.name && job.name !== "__default__"
                          ? job.name
                          : "Automated Task"}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {job.id && (
                          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[100px] sm:max-w-[150px]">
                            {job.id}
                          </span>
                        )}
                        {job.id && <span className="text-slate-300">•</span>}
                        <span className="text-xs font-medium text-indigo-600 flex items-center gap-1">
                          <Repeat size={12} />
                          {job.pattern}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Timing & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 flex-shrink-0 sm:pl-4">
                    <div className="flex flex-col sm:items-end">
                      <ScheduleCountdown targetTime={job.nextRunTimestamp} />
                      <span className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <CalendarClock size={12} />
                        {job.nextRun}
                      </span>
                    </div>

                    {/* Divider for desktop */}
                    <div className="hidden sm:block w-px h-8 bg-slate-100"></div>

                    <button
                      onClick={() => stopSchedule(job.key)}
                      className="p-2 text-slate-400 bg-slate-50 border border-slate-200 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-lg transition-colors flex-shrink-0"
                      title="Stop Schedule"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
