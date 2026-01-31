import React, { useCallback } from "react";
import { Trash2, Copy, X, GitCommit, MoreHorizontal } from "lucide-react";
import { useReactFlow } from "reactflow";

export default function ContextMenu({
  id,
  top,
  left,
  type, // 'node', 'edge', or 'pane'
  onClose,
  onDuplicate,
  onEdgeUpdate,
  onGlobalUpdate,
  globalDefaults,
}: any) {
  const { setNodes, setEdges } = useReactFlow();

  const handleDelete = useCallback(() => {
    if (type === "node") {
      setNodes((nodes) => nodes.filter((node) => node.id !== id));
      setEdges((edges) =>
        edges.filter((edge) => edge.source !== id && edge.target !== id),
      );
    } else if (type === "edge") {
      setEdges((edges) => edges.filter((edge) => edge.id !== id));
    }
    onClose();
  }, [id, setNodes, setEdges, onClose, type]);

  // Render edge control options (used for both specific edges and pane global defaults)
  const renderEdgeControls = (isGlobal: boolean) => {
    const handleTypeChange = (newType: string) => {
      if (isGlobal) onGlobalUpdate(newType, null);
      else onEdgeUpdate(id, newType, null);
      onClose();
    };

    const handlePatternChange = (newPattern: string) => {
      if (isGlobal) onGlobalUpdate(null, newPattern);
      else onEdgeUpdate(id, null, newPattern);
      onClose();
    };

    return (
      <div className="px-4 py-2 space-y-3 border-b border-gray-100">
        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase mb-1.5 flex items-center gap-1">
            <GitCommit size={10} /> Shape
          </label>
          <div className="flex bg-slate-100 p-0.5 rounded-md">
            {["smoothstep", "default", "straight"].map((t) => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`flex-1 text-[9px] font-bold py-1 rounded capitalize hover:bg-white hover:shadow-sm transition-all ${
                  isGlobal && globalDefaults.type === t
                    ? "bg-white shadow-sm text-indigo-600"
                    : "text-slate-500"
                }`}
              >
                {t === "default" ? "Curve" : t === "smoothstep" ? "Step" : t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-bold uppercase mb-1.5 flex items-center gap-1">
            <MoreHorizontal size={10} /> Pattern
          </label>
          <div className="flex bg-slate-100 p-0.5 rounded-md">
            {["solid", "dashed", "dotted"].map((s) => (
              <button
                key={s}
                onClick={() => handlePatternChange(s)}
                className={`flex-1 text-[9px] font-bold py-1 rounded capitalize hover:bg-white hover:shadow-sm transition-all ${
                  isGlobal && globalDefaults.pattern === s
                    ? "bg-white shadow-sm text-indigo-600"
                    : "text-slate-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{ top, left }}
      className="absolute z-50 bg-white border border-gray-200 shadow-xl rounded-lg w-56 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-3 py-2 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 flex justify-between items-center">
        <span>{type === "pane" ? "Canvas Defaults" : `${type} Actions`}</span>
        <button onClick={onClose} className="hover:text-slate-600">
          <X size={12} />
        </button>
      </div>

      {/* --- EDGE CONTROLS --- */}
      {/* Show if it's an edge OR if it's the global pane menu */}
      {(type === "edge" || type === "pane") &&
        renderEdgeControls(type === "pane")}

      {/* --- NODE SPECIFIC ACTIONS --- */}
      {type === "node" && (
        <button
          onClick={() => {
            onDuplicate(id);
            onClose();
          }}
          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
        >
          <Copy size={14} className="text-slate-400" /> Duplicate
        </button>
      )}

      {/* --- DELETE ACTION (Nodes & Edges only) --- */}
      {type !== "pane" && (
        <button
          onClick={handleDelete}
          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
        >
          <Trash2 size={14} /> Delete
        </button>
      )}
    </div>
  );
}
