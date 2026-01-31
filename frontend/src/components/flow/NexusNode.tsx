import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { NODE_TYPES, CATEGORY_COLORS } from "@/lib/nodeConfig";

const NexusNode = ({ data, selected }: NodeProps) => {
  const config = NODE_TYPES[data.type] || NODE_TYPES["math_operation"];
  const colors = CATEGORY_COLORS[config.category] || CATEGORY_COLORS.logic;
  const Icon = config.icon;

  return (
    <div
      className={`shadow-xl rounded-xl border-2 min-w-[240px] bg-white transition-all duration-200 
      ${selected ? "ring-2 ring-indigo-500 border-indigo-500 scale-105" : colors.border}
    `}
    >
      {/* Header */}
      <div
        className={`px-4 py-2 rounded-t-lg border-b flex items-center justify-between ${colors.bg} ${colors.border}`}
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
        {/* Status Indicator (Mock) */}
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
      </div>

      {/* Body */}
      <div className="p-4 bg-white rounded-b-lg relative">
        <div className="text-[10px] text-gray-400 font-mono mb-2 uppercase tracking-wide">
          ID: {data.label}
        </div>

        {/* Description / Summary of Config */}
        <div className="text-xs text-slate-600 font-medium truncate">
          {data.config?.description || "Not configured"}
        </div>
      </div>

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-slate-200 !border-2 !border-white hover:!bg-indigo-500 transition-colors -ml-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-slate-200 !border-2 !border-white hover:!bg-indigo-500 transition-colors -mr-2"
      />
    </div>
  );
};

export default memo(NexusNode);
