import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Clock, Loader2, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns'; // Optional: for "2 mins ago" formatting

export default function WorkflowManagerModal({ isOpen, onClose, onLoad }: any) {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  useEffect(() => {
    if (isOpen) {
      fetchWorkflows();
    }
  }, [isOpen]);

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/workflows`);
      const data = await response.json();
      if (data.success) {
        setWorkflows(data.workflows);
      }
    } catch (error) {
      console.error("Failed to fetch workflows:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/workflows/${id}`);
      const data = await response.json();
      if (data.success) {
        onLoad(data.workflow); // Pass the loaded data back to the canvas
        onClose();
      }
    } catch (error) {
      console.error("Failed to load workflow:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <FolderOpen size={18} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Saved Workflows</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-medium">
              No saved workflows found.
            </div>
          ) : (
            <div className="grid gap-3">
              {workflows.map((wf) => (
                <div key={wf.id} className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-indigo-300 hover:shadow-md transition-all group">
                  <div>
                    <h3 className="font-bold text-slate-800">{wf.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <Clock size={12} />
                      <span>Updated {new Date(wf.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleLoad(wf.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-100"
                  >
                    <Play size={14} fill="currentColor" /> Load
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