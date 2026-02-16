import React, { useState, useEffect } from "react";
import { X, Clock, Trash2, Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";

export default function ActiveSchedulesModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch schedules when modal opens
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
        {
          method: "DELETE",
        },
      );
      const data = await res.json();

      if (data.success) {
        toast.success("Schedule stopped successfully");
        // Remove from local state to update UI instantly
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
      <div className="bg-white rounded-xl shadow-2xl w-[600px] max-w-[90vw] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Active Schedules
              </h2>
              <p className="text-xs text-slate-400">
                Manage your running background workflows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* List Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh] bg-slate-50/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 size={24} className="animate-spin mb-2" />
              <span className="text-sm font-medium">Loading schedules...</span>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-white">
              <PlayCircle size={32} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-600 mb-1">
                No Active Schedules
              </h3>
              <p className="text-xs text-slate-400">
                Deploy a workflow with a Timer node to see it here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((job) => (
                <div
                  key={job.key}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700 font-mono">
                      {job.id}
                    </span>
                    <div className="flex items-center gap-3 mt-1 text-xs font-medium">
                      <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                        {job.pattern}
                      </span>
                      <span className="text-slate-400">
                        Next run:{" "}
                        <span className="text-slate-600">{job.nextRun}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => stopSchedule(job.key)}
                    className="p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Stop Schedule"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
