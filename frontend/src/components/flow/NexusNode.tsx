import React, { memo, useMemo } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { AlertCircle, Play, GitMerge, Loader2 } from "lucide-react";
import { NODE_TYPES, CATEGORY_COLORS } from "@/lib/nodeConfig";
import { useFlowContext } from "./FlowContext";
import NodeExecutionStatus from "../NodeExecutionStatus";

const NexusNode = ({ id, data, selected }: NodeProps) => {
  const { isCompact } = useFlowContext();
  const { setNodes } = useReactFlow();

  const type = data.type || "webhook";
  const config = NODE_TYPES[type] || NODE_TYPES["math_operation"];
  const colors = CATEGORY_COLORS[config.category] || CATEGORY_COLORS.logic;
  const Icon = config.icon;

  const isValid = useMemo(() => {
    if (!config.inputs) return true;
    return config.inputs.every((input: any) => {
      if (input.readOnly) return true;
      if (input.required === false) return true;
      const val = data.config?.[input.name];
      return val !== undefined && val !== null && val.toString().trim() !== "";
    });
  }, [config.inputs, data.config]);

  const execStatus = data.executionData?.status;

  // --- INDIVIDUAL NODE TESTING LOGIC ---
  const onTestClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (execStatus === "running") return; // Prevent double clicks

    // 1. Instantly show the "Running" spinner popover
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, executionData: { status: "running" } } }
          : n,
      ),
    );

    try {
      // 2. Call the backend endpoint
      const response = await fetch("http://localhost:3001/test-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: data.type,
          config: data.config,
        }),
      });

      const result = await response.json();

      // 3. Update the popover with Success or Failure
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  executionData: {
                    status: result.success ? "success" : "failed",
                    result: result.success ? result.data : undefined,
                    error: result.success ? undefined : result.error,
                  },
                },
              }
            : n,
        ),
      );
    } catch (error: any) {
      // Handle network errors
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  executionData: { status: "failed", error: error.message },
                },
              }
            : n,
        ),
      );
    }
  };

  const handleClasses =
    "w-2 h-2 rounded-full border border-white transition-all duration-200";

  // --- DYNAMIC EXECUTION STYLES ---
  let execStyles = "";
  if (execStatus === "running") {
    execStyles =
      "!ring-4 !ring-amber-400/50 !border-amber-500 animate-pulse z-20";
  } else if (execStatus === "success") {
    execStyles = "!ring-4 !ring-emerald-500/30 !border-emerald-500 z-20";
  } else if (execStatus === "failed") {
    execStyles = "!ring-4 !ring-red-500/30 !border-red-500 z-20";
  }

  // --- SPECIAL RENDER: MERGE NODE ---
  if (type === "merge") {
    return (
      <div
        className={`
          relative w-12 h-12 rounded-full bg-white border-2 shadow-md transition-all duration-200 group
          ${selected ? "ring-2 ring-indigo-500 border-indigo-500 scale-110 z-10" : "border-slate-300"}
          ${execStyles}
          hover:shadow-lg hover:border-indigo-400
        `}
        title="Merge / Wait"
      >
        <NodeExecutionStatus nodeId={id} executionData={data.executionData} />

        <div className="absolute inset-0 flex items-center justify-center text-slate-600">
          {Icon ? <Icon size={20} /> : <GitMerge size={20} />}
        </div>
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !border-2 !border-white !bg-indigo-400 hover:scale-125 transition-transform absolute"
          style={{ top: "50%", transform: "translate(-50%, -50%)", left: -9 }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !border-2 !border-white !bg-indigo-400 hover:scale-125 transition-transform absolute"
          style={{ top: "50%", transform: "translate(50%, -50%)", right: -9 }}
        />
      </div>
    );
  }

  // --- VIEW 1: COMPACT ICON STYLE ---
  if (isCompact) {
    return (
      <div className="relative group flex flex-col items-center">
        <NodeExecutionStatus nodeId={id} executionData={data.executionData} />

        <div
          className={`
            relative w-12 h-12 flex items-center justify-center rounded-2xl bg-white shadow-sm transition-all duration-300 ease-out z-10
            ${selected ? "ring-2 ring-indigo-500 ring-offset-2 border-transparent scale-105" : "border border-slate-200 hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5"}
            ${!isValid ? "!border-red-400" : ""}
            ${execStyles}
          `}
        >
          <div
            className={`transition-colors duration-300 ${isValid ? colors.text : "text-red-400"}`}
          >
            <Icon size={20} strokeWidth={1.5} />
          </div>

          {!isValid && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 border-2 border-white shadow-sm">
              <AlertCircle size={8} />
            </div>
          )}

          {/* Hide test button for logic nodes (like condition/merge) */}
          {isValid &&
            config.category !== "trigger" &&
            config.category !== "logic" && (
              <button
                onClick={onTestClick}
                disabled={execStatus === "running"}
                className="absolute -top-2 -right-2 bg-slate-800 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 hover:bg-indigo-600 shadow-lg z-30 disabled:bg-amber-500"
                title="Test Node"
              >
                {execStatus === "running" ? (
                  <Loader2 size={8} className="animate-spin" />
                ) : (
                  <Play size={8} fill="currentColor" />
                )}
              </button>
            )}
        </div>

        <div
          className={`absolute top-14 text-[10px] font-medium text-center whitespace-nowrap px-2 py-0.5 rounded-md transition-all duration-200 ${selected ? "text-indigo-600 bg-indigo-50" : "text-slate-400 group-hover:text-slate-600 group-hover:bg-white/50"}`}
        >
          {data.config?.description || config.label}
        </div>

        {/* Handles */}
        {config.category !== "trigger" && (
          <Handle
            type="target"
            position={Position.Left}
            className={`${handleClasses} !bg-slate-300 group-hover:!bg-indigo-400`}
            style={{ left: -4 }}
          />
        )}
        {type === "condition" ? (
          <>
            <div className="absolute -right-[4px] top-[25%]">
              <Handle
                id="true"
                type="source"
                position={Position.Right}
                className={`${handleClasses} !bg-emerald-400`}
                style={{
                  right: 0,
                  top: 0,
                  position: "relative",
                  transform: "none",
                }}
              />
            </div>
            <div className="absolute -right-[4px] top-[75%]">
              <Handle
                id="false"
                type="source"
                position={Position.Right}
                className={`${handleClasses} !bg-rose-400`}
                style={{
                  right: 0,
                  top: 0,
                  position: "relative",
                  transform: "none",
                }}
              />
            </div>
          </>
        ) : (
          <Handle
            type="source"
            position={Position.Right}
            className={`${handleClasses} !bg-slate-300 group-hover:!bg-indigo-400`}
            style={{ right: -4 }}
          />
        )}
      </div>
    );
  }

  // --- VIEW 2: FULL CARD STYLE ---
  return (
    <div
      className={`
        relative shadow-xl rounded-xl border-2 min-w-[240px] bg-white transition-all duration-200 group
        ${selected ? "ring-2 ring-indigo-500 border-indigo-500 scale-105 z-10" : ""}
        ${!isValid ? "border-red-400 ring-2 ring-red-100" : colors.border}
        ${execStyles}
      `}
    >
      <NodeExecutionStatus nodeId={id} executionData={data.executionData} />

      {!isValid && (
        <div className="absolute -top-3 -right-3 z-20 bg-red-500 text-white p-1 rounded-full shadow-md animate-bounce">
          <AlertCircle size={16} />
        </div>
      )}

      {/* Header */}
      <div
        className={`px-4 py-2 rounded-t-lg border-b flex items-center justify-between ${colors.bg} ${isValid ? colors.border : "border-red-100"}`}
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
          {isValid &&
            config.category !== "trigger" &&
            config.category !== "logic" && (
              <button
                className={`p-1 rounded transition-colors ${execStatus === "running" ? "text-amber-500" : "text-slate-500 hover:text-indigo-600 hover:bg-white/50"}`}
                title="Test this node"
                onClick={onTestClick}
                disabled={execStatus === "running"}
              >
                {execStatus === "running" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Play size={10} fill="currentColor" />
                )}
              </button>
            )}
          {isValid ? (
            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-red-400" />
          )}
        </div>
      </div>

      {/* Content */}
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

      {/* Handles */}
      {config.category !== "trigger" && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !border-2 !border-white transition-transform duration-200 hover:scale-125"
          style={{ backgroundColor: getHandleColor(config.category), left: -9 }}
        />
      )}
      {type === "condition" ? (
        <>
          <div className="absolute -right-[9px] top-1/2 -translate-y-4 flex items-center group/true">
            <span className="text-[9px] font-bold text-green-600 mr-2 bg-white/90 px-1 rounded opacity-0 group-hover/true:opacity-100 transition-opacity pointer-events-none">
              TRUE
            </span>
            <Handle
              id="true"
              type="source"
              position={Position.Right}
              className="!relative !w-3 !h-3 !border-2 !border-white !bg-green-500 hover:scale-125 transition-transform"
              style={{ top: 0, transform: "none", right: 0 }}
            />
          </div>
          <div className="absolute -right-[9px] top-1/2 translate-y-4 flex items-center group/false">
            <span className="text-[9px] font-bold text-red-500 mr-2 bg-white/90 px-1 rounded opacity-0 group-hover/false:opacity-100 transition-opacity pointer-events-none">
              FALSE
            </span>
            <Handle
              id="false"
              type="source"
              position={Position.Right}
              className="!relative !w-3 !h-3 !border-2 !border-white !bg-red-500 hover:scale-125 transition-transform"
              style={{ top: 0, transform: "none", right: 0 }}
            />
          </div>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !border-2 !border-white transition-transform duration-200 hover:scale-125"
          style={{
            backgroundColor: getHandleColor(config.category),
            right: -9,
          }}
        />
      )}
    </div>
  );
};

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
