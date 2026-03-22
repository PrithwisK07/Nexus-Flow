import React, { memo, useEffect } from "react";
import { Handle, Position, NodeProps, useUpdateNodeInternals } from "reactflow";
import { GitFork, AlertCircle } from "lucide-react";

const SwitchNode = ({ id, data, selected }: NodeProps) => {
  // 🟢 1. The Magic Hook: Tells ReactFlow to recalculate handles when they change
  const updateNodeInternals = useUpdateNodeInternals();

  const rawRoutes = data.config?.routes || "";
  // Split by comma, trim whitespace, and remove empty strings
  const routes = rawRoutes
    .split(",")
    .map((r: string) => r.trim())
    .filter((r: string) => r.length > 0);

  // 🟢 2. Trigger the internal update whenever the routes string changes
  useEffect(() => {
    updateNodeInternals(id);
  }, [rawRoutes, id, updateNodeInternals]);

  return (
    <div
      className={`shadow-xl rounded-xl border-2 bg-white min-w-[250px] transition-all ${
        selected
          ? "border-indigo-500 ring-2 ring-indigo-200"
          : "border-slate-200"
      }`}
    >
      {/* HEADER */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100 rounded-t-xl">
        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg shadow-sm">
          <GitFork size={16} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Switch Router</h3>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            Value:{" "}
            <span className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">
              {data.config?.value || "{{variable}}"}
            </span>
          </p>
        </div>
      </div>

      {/* BODY */}
      <div className="p-0 relative py-2">
        {/* SINGLE INPUT HANDLE (Left) */}
        <Handle
          type="target"
          position={Position.Left}
          id="input" // Good practice to ID the target handle too
          className="!bg-slate-400 !w-4 !h-4 !-left-2.5 !border-2 !border-white shadow-sm"
        />

        {/* DYNAMIC OUTPUT HANDLES (Right) */}
        <div className="flex flex-col w-full">
          {routes.length === 0 && (
            <div className="px-4 py-2 text-[11px] text-amber-600 bg-amber-50 flex items-center gap-2">
              <AlertCircle size={14} />
              <span>Type routes in settings (e.g. "BUY, SELL")</span>
            </div>
          )}

          {/* Loop through user inputs and create a handle for each */}
          {routes.map((route: string) => (
            <div
              key={route}
              className="relative group flex justify-between items-center px-4 py-2 hover:bg-slate-50 border-b border-slate-50"
            >
              <span
                className="text-[11px] font-bold text-slate-600 font-mono truncate max-w-[150px]"
                title={route}
              >
                CASE "{route}"
              </span>

              <Handle
                type="source"
                position={Position.Right}
                id={route} // 🟢 The exact case name is the Handle ID!
                className="!bg-indigo-500 !w-3.5 !h-3.5 !-right-2 !border-2 !border-white z-10"
              />
            </div>
          ))}

          {/* DEFAULT HANDLE (Always there as a fallback) */}
          <div className="relative group flex justify-between items-center px-4 py-2 mt-1 border-t border-slate-100 bg-slate-50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Default / Else
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="default"
              className="!bg-slate-300 !w-3.5 !h-3.5 !-right-2 !border-2 !border-white z-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(SwitchNode);
