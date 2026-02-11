import React, { memo, useMemo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { AlertCircle, Play } from "lucide-react";
import { NODE_TYPES, CATEGORY_COLORS } from "@/lib/nodeConfig";

const NexusNode = ({ data, selected }: NodeProps) => {
  // 1. Resolve Config & Styles
  const type = data.type || "webhook";
  const config = NODE_TYPES[type] || NODE_TYPES["math_operation"];
  const colors = CATEGORY_COLORS[config.category] || CATEGORY_COLORS.logic;
  const Icon = config.icon;

  // 2. Smart Validation Logic
  const isValid = useMemo(() => {
    if (!config.inputs) return true;
    return config.inputs.every((input: any) => {
      if (input.readOnly) return true;
      if (input.required === false) return true;
      const val = data.config?.[input.name];
      return val !== undefined && val !== null && val.toString().trim() !== "";
    });
  }, [config.inputs, data.config]);

  const onTestClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`🚀 Testing Node [${data.label}]...`, data.config);
  };

  // --- SPECIAL RENDER: MERGE NODE (CIRCLE) ---
  if (type === "merge") {
    return (
      <div
        className={`
          relative w-12 h-12 flex items-center justify-center rounded-full bg-white border-2 shadow-md transition-all duration-200
          ${selected ? "ring-2 ring-indigo-500 border-indigo-500 scale-110 z-10" : "border-slate-300"}
          hover:shadow-lg hover:border-indigo-400
        `}
        title="Merge / Wait"
      >
        <div className="text-slate-600">
          <Icon size={20} />
        </div>

        {/* Input Handle (Accepts multiple connections) */}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !border-2 !border-white !bg-slate-400 hover:scale-125 -ml-[8px]"
        />

        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !border-2 !border-white !bg-slate-400 hover:scale-125 -mr-[8px]"
        />

        {/* Label (Floating below) */}
        <div className="absolute -bottom-6 w-32 text-center left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Merge
        </div>
      </div>
    );
  }

  // --- STANDARD RENDER: RECTANGULAR CARD ---
  return (
    <div
      className={`
        relative shadow-xl rounded-xl border-2 min-w-[240px] bg-white transition-all duration-200 group
        ${selected ? "ring-2 ring-indigo-500 border-indigo-500 scale-105 z-10" : ""}
        ${!isValid ? "border-red-400 ring-2 ring-red-100" : colors.border}
      `}
    >
      {/* Validation Error Badge */}
      {!isValid && (
        <div className="absolute -top-3 -right-3 z-20 bg-red-500 text-white p-1 rounded-full shadow-md animate-bounce">
          <AlertCircle size={16} />
        </div>
      )}

      {/* Header Section */}
      <div
        className={`
        px-4 py-2 rounded-t-lg border-b flex items-center justify-between 
        ${colors.bg} 
        ${isValid ? colors.border : "border-red-100"}
      `}
      >
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md bg-white/60 ${colors.text}`}>
            <Icon size={14} />
          </div>
          <span
            className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}
          >
            {config.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isValid && config.category !== "trigger" && (
            <button
              className="p-1 rounded hover:bg-white/50 text-slate-500 hover:text-indigo-600 transition-colors"
              title="Test this node"
              onClick={onTestClick}
            >
              <Play size={10} fill="currentColor" />
            </button>
          )}

          {isValid ? (
            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-red-400" />
          )}
        </div>
      </div>

      {/* Body / Content Section */}
      <div className="p-4 bg-white rounded-b-lg relative">
        <div className="flex justify-between items-center mb-2">
          <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wide">
            ID: {data.label}
          </div>
        </div>

        <div
          className={`text-xs font-medium truncate ${!isValid ? "text-red-400 italic" : "text-slate-600"}`}
        >
          {!isValid
            ? "Missing configuration..."
            : data.config?.description || config.label}
        </div>
      </div>

      {/* --- CONNECTION HANDLES --- */}
      {config.category !== "trigger" && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !border-2 !border-white transition-transform duration-200 hover:scale-125 -ml-[7px]"
          style={{ backgroundColor: getHandleColor(config.category) }}
        />
      )}

      {type === "condition" ? (
        <>
          <div className="absolute -right-[7px] top-1/2 -translate-y-4 flex items-center group/true">
            <span className="text-[9px] font-bold text-green-600 mr-2 bg-white/90 px-1 rounded opacity-0 group-hover/true:opacity-100 transition-opacity pointer-events-none">
              TRUE
            </span>
            <Handle
              id="true"
              type="source"
              position={Position.Right}
              className="!relative !w-3 !h-3 !border-2 !border-white !bg-green-500 hover:scale-125 transition-transform"
              style={{ top: 0, transform: "none" }}
            />
          </div>
          <div className="absolute -right-[7px] top-1/2 translate-y-4 flex items-center group/false">
            <span className="text-[9px] font-bold text-red-500 mr-2 bg-white/90 px-1 rounded opacity-0 group-hover/false:opacity-100 transition-opacity pointer-events-none">
              FALSE
            </span>
            <Handle
              id="false"
              type="source"
              position={Position.Right}
              className="!relative !w-3 !h-3 !border-2 !border-white !bg-red-500 hover:scale-125 transition-transform"
              style={{ top: 0, transform: "none" }}
            />
          </div>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !border-2 !border-white transition-transform duration-200 hover:scale-125 -mr-[7px]"
          style={{ backgroundColor: getHandleColor(config.category) }}
        />
      )}
    </div>
  );
};

// Helper: Determine Handle color based on Node Category
const getHandleColor = (category: string) => {
  switch (category) {
    case "trigger":
      return "#f59e0b";
    case "web3":
      return "#6366f1";
    case "data":
      return "#10b981";
    case "logic":
      return "#64748b";
    case "notify":
      return "#f43f5e";
    case "ops":
      return "#3b82f6";
    default:
      return "#94a3b8";
  }
};

export default memo(NexusNode);
