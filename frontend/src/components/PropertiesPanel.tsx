import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Settings,
  Braces,
  ChevronRight,
  Activity,
  Database,
  Cpu,
} from "lucide-react";
import { NODE_TYPES, CATEGORY_COLORS } from "@/lib/nodeConfig";
import LogicBuilder from "./LogicBuilder";

export default function PropertiesPanel({
  selectedNode,
  updateData,
  onClose,
  globalSettings,
  nodes,
}: any) {
  const type = selectedNode.data.type;
  const config = NODE_TYPES[type] || NODE_TYPES["math_operation"] || {};
  const colors = CATEGORY_COLORS[config.category] || CATEGORY_COLORS.logic;
  const currentData = selectedNode.data.config || {};

  const [activeField, setActiveField] = useState<string | null>(null);

  // NEW: State and Refs for precise cursor tracking on main panel inputs
  const [cursorPos, setCursorPos] = useState<{
    field: string;
    pos: number;
  } | null>(null);
  const inputRefs = useRef<
    Record<string, HTMLInputElement | HTMLTextAreaElement>
  >({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setActiveField(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (field: string, value: any) => {
    updateData(selectedNode.id, { [field]: value });
  };

  // NEW: Hotkey Listener for Text/Textarea
  const handleKeyDown = (e: React.KeyboardEvent, fieldName: string) => {
    if (e.ctrlKey && e.code === "Space") {
      e.preventDefault();
      const el = inputRefs.current[fieldName];
      setCursorPos({ field: fieldName, pos: el?.selectionStart || 0 });
      setActiveField(fieldName);
    }
    if (e.code === "Escape" && activeField === fieldName) {
      setActiveField(null);
    }
  };

  const updateCursor = (fieldName: string) => {
    const el = inputRefs.current[fieldName];
    if (el) setCursorPos({ field: fieldName, pos: el.selectionStart || 0 });
  };

  /**
   * UPDATED: Handles Scoped Variable Insertion at specific cursor locations
   */
  const insertVariable = (field: string, varName: string, nodeId?: string) => {
    const currentValue = currentData[field] || "";
    const formattedVar = nodeId ? `{{${nodeId}.${varName}}}` : `{{${varName}}}`;

    if (cursorPos && cursorPos.field === field) {
      const before = currentValue.slice(0, cursorPos.pos);
      const after = currentValue.slice(cursorPos.pos);
      handleChange(field, `${before}${formattedVar}${after}`);

      // Re-focus and shift cursor
      setTimeout(() => {
        const el = inputRefs.current[field];
        if (el) {
          el.focus();
          const newPos = cursorPos.pos + formattedVar.length;
          el.setSelectionRange(newPos, newPos);
        }
      }, 0);
    } else {
      handleChange(field, `${currentValue}${formattedVar}`);
    }

    setActiveField(null);
    setCursorPos(null);
  };

  // --- SMART VARIABLE DISCOVERY ---
  const getAvailableVariables = () => {
    const vars: any[] = [];
    const hasSheetTrigger = nodes.some((n: any) => n.data.type === "sheets");

    if (hasSheetTrigger) {
      if (
        globalSettings?.columnMapping &&
        Object.keys(globalSettings.columnMapping).length > 0
      ) {
        Object.entries(globalSettings.columnMapping).forEach(([col, name]) => {
          vars.push({
            name: name as string,
            desc: `Sheet Column ${String.fromCharCode(65 + Number(col))}`,
            icon: "sheet",
          });
        });
      }
      vars.push({
        name: "ROW_INDEX",
        desc: "Current Processing Row",
        icon: "system",
      });
    }

    nodes.forEach((node: any) => {
      if (node.id === selectedNode.id) return;
      const nodeConfig = NODE_TYPES[node.data.type];
      if (nodeConfig?.outputs) {
        nodeConfig.outputs.forEach((out: any) => {
          let varName = out.name;
          if (out.name === "dynamic" && out.sourceField) {
            varName = node.data.config?.[out.sourceField];
          }
          if (varName) {
            vars.push({
              name: varName,
              nodeId: node.id,
              desc: `${out.desc}`,
              sourceLabel: node.data.label || nodeConfig.label,
              icon: "node",
            });
          }
        });
      }
    });

    return vars;
  };

  const variables = getAvailableVariables();

  return (
    <div className="w-96 bg-white border-l border-gray-200 h-full flex flex-col shadow-2xl z-30 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            {React.createElement(config.icon, {
              size: 18,
              className: colors.text,
            })}
          </div>
          <div>
            <h2 className="font-bold text-slate-800">{config.label}</h2>
            <p className="text-xs text-slate-400 font-mono">
              {selectedNode.data.label}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex-1 space-y-6">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Settings size={14} /> Configuration
          </h3>

          {config.inputs &&
            config.inputs.map((input: any) => (
              <div key={input.name} className="space-y-1.5 relative group">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-bold text-slate-700">
                    {input.label}
                  </label>
                  <div className="flex items-center gap-2">
                    {!input.readOnly &&
                      (input.type === "text" || input.type === "textarea") && (
                        <span className="text-[9px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity font-sans pointer-events-none">
                          Ctrl+Space
                        </span>
                      )}
                    {input.required === false && (
                      <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 bg-slate-100 rounded">
                        Optional
                      </span>
                    )}
                  </div>
                </div>

                {input.type === "logic-builder" ? (
                  <LogicBuilder
                    value={
                      currentData[input.name] || {
                        combinator: "AND",
                        rules: [],
                      }
                    }
                    onChange={(val: any) => handleChange(input.name, val)}
                    variables={variables}
                  />
                ) : input.type === "select" ? (
                  <select
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                    value={currentData[input.name] || ""}
                    onChange={(e) => handleChange(input.name, e.target.value)}
                  >
                    <option value="" disabled>
                      Select an option
                    </option>
                    {input.options.map((opt: string) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="relative group/input">
                    {input.type === "textarea" ? (
                      <textarea
                        ref={(el) => {
                          if (el) inputRefs.current[input.name] = el;
                        }}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-slate-900 h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-sm font-mono"
                        placeholder={input.placeholder || ""}
                        value={currentData[input.name] || ""}
                        onChange={(e) => {
                          handleChange(input.name, e.target.value);
                          updateCursor(input.name);
                        }}
                        onKeyDown={(e) => handleKeyDown(e, input.name)}
                        onClick={() => updateCursor(input.name)}
                        onKeyUp={() => updateCursor(input.name)}
                      />
                    ) : (
                      <input
                        ref={(el) => {
                          if (el) inputRefs.current[input.name] = el;
                        }}
                        type={input.type}
                        className="w-full p-2.5 pr-8 bg-white border border-gray-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm font-mono"
                        placeholder={input.placeholder || ""}
                        value={currentData[input.name] || ""}
                        readOnly={input.readOnly}
                        onChange={(e) => {
                          handleChange(input.name, e.target.value);
                          updateCursor(input.name);
                        }}
                        onKeyDown={(e) => handleKeyDown(e, input.name)}
                        onClick={() => updateCursor(input.name)}
                        onKeyUp={() => updateCursor(input.name)}
                      />
                    )}

                    {!input.readOnly &&
                      (input.type === "text" || input.type === "textarea") && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            updateCursor(input.name);
                            setActiveField(
                              activeField === input.name ? null : input.name,
                            );
                          }}
                          className={`absolute right-2 top-2 p-1 rounded transition-colors ${activeField === input.name ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"}`}
                          title="Insert Variable (Ctrl + Space)"
                        >
                          <Braces size={14} />
                        </button>
                      )}

                    {activeField === input.name && (
                      <div
                        ref={dropdownRef}
                        className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                      >
                        <div className="bg-slate-50 px-3 py-2 border-b border-gray-200 text-[10px] font-bold text-slate-500 uppercase flex justify-between items-center">
                          <span>Insert Data Variable</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-normal text-slate-400 normal-case bg-slate-200/50 px-1 rounded">
                              esc to close
                            </span>
                            <span className="text-indigo-500">
                              {variables.length} available
                            </span>
                          </div>
                        </div>

                        <div className="max-h-64 overflow-y-auto">
                          {variables.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400 italic">
                              No available output variables found. Add
                              data-generating nodes (Price, Contract, etc.) to
                              the canvas.
                            </div>
                          ) : (
                            variables.map((v, idx) => (
                              <button
                                key={`${v.name}-${idx}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  insertVariable(input.name, v.name, v.nodeId);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0 group/item"
                              >
                                <div
                                  className={`p-2 rounded-lg shrink-0 ${v.icon === "sheet" ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}
                                >
                                  {v.icon === "sheet" ? (
                                    <Database size={14} />
                                  ) : (
                                    <Cpu size={14} />
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-700 font-mono truncate group-hover/item:text-indigo-600">
                                      {v.name}
                                    </span>
                                    {v.nodeId && (
                                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded uppercase font-bold">
                                        {v.sourceLabel}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 truncate">
                                    {v.desc}
                                  </span>
                                </div>
                                <ChevronRight
                                  size={14}
                                  className="text-slate-300 group-hover/item:text-indigo-400"
                                />
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

          {(!config.inputs || config.inputs.length === 0) && (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <Activity className="mx-auto text-slate-300 mb-2" size={24} />
              <p className="text-sm text-slate-400 px-4 text-balance">
                This node operates automatically and requires no manual
                configuration.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-gray-100">
        <p className="text-[10px] text-slate-400 leading-relaxed text-center">
          Variables used as{" "}
          <code className="text-indigo-500 font-bold">{"{{ID.Var}}"}</code> are
          automatically resolved during workflow execution.
        </p>
      </div>
    </div>
  );
}
