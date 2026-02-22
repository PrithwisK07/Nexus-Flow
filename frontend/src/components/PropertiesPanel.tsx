import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Settings,
  Braces,
  ChevronRight,
  Activity,
  Database,
  Cpu,
  Search,
  ChevronDown,
  Check,
  Coins,
  Lock,
  // newly added generic select icons:
  Plus,
  Minus,
  Divide,
  Percent,
  Send,
  FileText,
  Trash2,
  Type,
  ArrowRightLeft,
  Hash,
  Clock,
  CalendarClock,
  List,
  AlignLeft,
  Zap,
  MessageCircle,
  Ruler,
} from "lucide-react";
import { NODE_TYPES, CATEGORY_COLORS } from "@/lib/nodeConfig";
import LogicBuilder from "./LogicBuilder";

// --- Upgraded: Generic Icon Mapper for all Select Options ---
const getSelectOptionIcon = (opt: string, disabled: boolean = false) => {
  // 1. Web3 Token Icons
  const tokenIcons: Record<string, string> = {
    ETH: "https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=025",
    USDC: "https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=025",
    WETH: "https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=025",
    UNI: "https://cryptologos.cc/logos/uniswap-uni-logo.svg?v=025",
    LINK: "https://cryptologos.cc/logos/chainlink-link-logo.svg?v=025",
  };

  const opacityClass = disabled ? "opacity-40 grayscale" : "";

  if (tokenIcons[opt]) {
    return (
      <img
        src={tokenIcons[opt]}
        alt={opt}
        className={`rounded-full shadow-sm ${opacityClass}`}
        style={{ width: "18px", height: "18px" }} // Fixed sizing constraint
      />
    );
  }

  // 2. Standard / Generic Option Icons
  const IconProps = {
    size: 16,
    className: disabled ? "text-slate-300" : "text-indigo-500",
  };

  switch (opt?.toLowerCase()) {
    case "custom":
      return <Coins {...IconProps} />;

    // Math
    case "add":
      return <Plus {...IconProps} />;
    case "subtract":
      return <Minus {...IconProps} />;
    case "multiply":
      return <X {...IconProps} />; // Repurposing X for multiply
    case "divide":
      return <Divide {...IconProps} />;
    case "percent":
      return <Percent {...IconProps} />;

    // HTTP
    case "get":
      return <Search {...IconProps} />;
    case "post":
      return <Send {...IconProps} />;
    case "put":
      return <FileText {...IconProps} />;
    case "delete":
      return <Trash2 {...IconProps} />;

    // Transform
    case "upper":
    case "lower":
      return <Type {...IconProps} />;
    case "replace":
      return <ArrowRightLeft {...IconProps} />;
    case "parse_number":
      return <Hash {...IconProps} />;

    // Timer
    case "interval":
      return <Clock {...IconProps} />;
    case "cron":
      return <CalendarClock {...IconProps} />;

    // Formats / AI
    case "bullet points":
      return <List {...IconProps} />;
    case "paragraph":
      return <AlignLeft {...IconProps} />;
    case "tldr":
      return <Zap {...IconProps} />;
    case "tweet":
      return <MessageCircle {...IconProps} />;
    case "short":
    case "medium":
    case "long":
      return <Ruler {...IconProps} />;
    case "true":
    case "false":
      return <Check {...IconProps} />;

    default:
      // Graceful fallback for unknown strings (maintains perfect spacing)
      return (
        <div
          className={`w-1.5 h-1.5 rounded-full ml-1 ${disabled ? "bg-slate-200" : "bg-indigo-300"}`}
        />
      );
  }
};

// --- Deterministic Gradient Avatar for Addresses ---
const AddressAvatar = ({
  seed,
  disabled,
}: {
  seed: string;
  disabled: boolean;
}) => {
  if (!seed) {
    return (
      <div
        className={`w-5 h-5 rounded-full bg-slate-100 border border-slate-200 ${disabled ? "opacity-50" : ""}`}
      />
    );
  }

  // If the seed contains a workflow variable, show a logic icon instead of a color gradient
  if (seed.includes("{{")) {
    return (
      <div
        className={`w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 ${disabled ? "opacity-50 grayscale" : ""}`}
      >
        <Braces size={10} strokeWidth={3} />
      </div>
    );
  }

  // Simple string hash to generate deterministic colors
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h1 = Math.abs(hash) % 360;
  const h2 = Math.abs(hash * 13) % 360;

  const c1 = `hsl(${h1}, 80%, 65%)`;
  const c2 = `hsl(${h2}, 80%, 75%)`;

  return (
    <div
      className={`w-5 h-5 rounded-full shadow-inner ${disabled ? "opacity-40 grayscale" : ""}`}
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
    />
  );
};

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

  // Global Picker State
  const [pickerConfig, setPickerConfig] = useState<{
    onInsert: (varName: string, nodeId?: string) => void;
  } | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Custom Select State
  const [openSelect, setOpenSelect] = useState<string | null>(null);

  const inputRefs = useRef<
    Record<string, HTMLInputElement | HTMLTextAreaElement>
  >({});

  // Close overlays on Escape key
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pickerConfig) {
          setPickerConfig(null);
          setExpandedGroup(null);
          setSearchQuery("");
        }
        setOpenSelect(null);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [pickerConfig]);

  const handleChange = (field: string, value: any) => {
    updateData(selectedNode.id, { [field]: value });
  };

  // --- Dependency Logic ---
  const isInputDisabled = (inputName: string) => {
    if (inputName === "customTokenIn")
      return currentData["tokenIn"] !== "Custom";
    if (inputName === "customTokenOut")
      return currentData["tokenOut"] !== "Custom";
    if (inputName === "customDecimals" || inputName === "customIsNative") {
      return (
        currentData["tokenIn"] !== "Custom" &&
        currentData["tokenOut"] !== "Custom"
      );
    }
    if (inputName === "customToken") return currentData["token"] !== "Custom";
    return false;
  };

  // Open the Full-Width Picker
  const handleOpenStandardPicker = (fieldName: string) => {
    if (isInputDisabled(fieldName)) return;

    const el = inputRefs.current[fieldName];
    const pos = el?.selectionStart || (currentData[fieldName] || "").length;

    setPickerConfig({
      onInsert: (varName: string, nodeId?: string) => {
        const formatted = nodeId
          ? `{{${nodeId}.${varName}}}`
          : `{{${varName}}}`;
        const currentValue = currentData[fieldName] || "";

        const before = currentValue.slice(0, pos);
        const after = currentValue.slice(pos);
        handleChange(fieldName, `${before}${formatted}${after}`);

        setPickerConfig(null);
        setExpandedGroup(null);
        setSearchQuery("");

        setTimeout(() => {
          const focusEl = inputRefs.current[fieldName];
          if (focusEl) {
            focusEl.focus();
            const newPos = pos + formatted.length;
            focusEl.setSelectionRange(newPos, newPos);
          }
        }, 0);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, fieldName: string) => {
    if (e.ctrlKey && e.code === "Space") {
      e.preventDefault();
      handleOpenStandardPicker(fieldName);
    }
  };

  const getAvailableVariables = () => {
    const groups: Record<string, any> = {};

    const addVarToGroup = (
      groupId: string,
      label: string,
      icon: string,
      variable: any,
    ) => {
      if (!groups[groupId]) {
        groups[groupId] = { id: groupId, label, icon, variables: [] };
      }
      groups[groupId].variables.push(variable);
    };

    const hasSheetTrigger = nodes.some((n: any) => n.data.type === "sheets");

    if (hasSheetTrigger) {
      if (
        globalSettings?.columnMapping &&
        Object.keys(globalSettings.columnMapping).length > 0
      ) {
        Object.entries(globalSettings.columnMapping).forEach(([col, name]) => {
          addVarToGroup("sheets", "Google Sheets", "sheet", {
            name: name as string,
            desc: `Sheet Column ${String.fromCharCode(65 + Number(col))}`,
          });
        });
      }
      addVarToGroup("sheets", "Google Sheets", "sheet", {
        name: "ROW_INDEX",
        desc: "Current Processing Row",
      });
    }

    nodes.forEach((node: any) => {
      if (node.id === selectedNode.id) return;
      const nodeConfig = NODE_TYPES[node.data.type];

      if (nodeConfig?.outputs) {
        nodeConfig.outputs.forEach((out: any) => {
          const groupLabel = node.data.label || nodeConfig.label;

          if (out.name === "dynamic" && out.sourceField === "schema") {
            const schemaText = node.data.config?.[out.sourceField];
            if (schemaText) {
              try {
                const parsedSchema = JSON.parse(schemaText);
                Object.keys(parsedSchema).forEach((key) => {
                  addVarToGroup(node.id, groupLabel, "node", {
                    name: key,
                    nodeId: node.id,
                    desc: `AI Output (${parsedSchema[key]})`,
                  });
                });
              } catch (e) {}
            }
            return;
          }

          let varName = out.name;
          if (out.name === "dynamic" && out.sourceField !== "schema") {
            varName = node.data.config?.[out.sourceField];
          }

          if (varName) {
            addVarToGroup(node.id, groupLabel, "node", {
              name: varName,
              nodeId: node.id,
              desc: `${out.desc}`,
            });
          }
        });
      }
    });

    return Object.values(groups);
  };

  const rawVariableGroups = getAvailableVariables();
  const filteredGroups = rawVariableGroups
    .map((group) => ({
      ...group,
      variables: group.variables.filter(
        (v: any) =>
          v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.desc.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((group) => group.variables.length > 0);

  return (
    <div className="w-96 bg-white border-l border-gray-200 h-full flex flex-col shadow-2xl z-30 relative overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-50 shrink-0">
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

      {/* Main Content */}
      <div className="p-6 overflow-y-auto flex-1 space-y-6 pb-32 custom-scrollbar">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Settings size={14} /> Configuration
          </h3>

          {config.inputs &&
            config.inputs.map((input: any) => {
              const isDisabled = isInputDisabled(input.name);
              // Identify if this input is meant for a wallet or contract address
              const isAddressField = [
                "address",
                "recipient",
                "customtoken",
                "contract",
              ].some((k) => input.name.toLowerCase().includes(k));

              return (
                <div
                  key={input.name}
                  className={`space-y-1.5 relative group ${openSelect === input.name ? "z-50" : "z-10"}`}
                >
                  <div className="flex justify-between items-end">
                    <label
                      className={`text-sm font-bold flex items-center gap-1.5 ${isDisabled ? "text-slate-400" : "text-slate-700"}`}
                    >
                      {input.label}
                      {isDisabled && (
                        <Lock size={12} className="text-slate-300" />
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      {!input.readOnly &&
                        !isDisabled &&
                        (input.type === "text" ||
                          input.type === "textarea") && (
                          <span className="text-[9px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity font-sans pointer-events-none">
                            Ctrl+Space
                          </span>
                        )}
                      {input.required === false && (
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isDisabled ? "bg-slate-50 text-slate-300" : "bg-slate-100 text-slate-400"}`}
                        >
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
                      onOpenPicker={(callback) =>
                        setPickerConfig({ onInsert: callback })
                      }
                    />
                  ) : input.type === "select" ? (
                    <div className="relative">
                      {openSelect === input.name && (
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setOpenSelect(null)}
                        />
                      )}
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() =>
                          setOpenSelect(
                            openSelect === input.name ? null : input.name,
                          )
                        }
                        className={`relative z-50 w-full px-3 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between border ${
                          isDisabled
                            ? "bg-slate-50 border-slate-200 cursor-not-allowed"
                            : openSelect === input.name
                              ? "bg-white border-indigo-500 ring-4 ring-indigo-500/10 shadow-sm"
                              : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {getSelectOptionIcon(
                            currentData[input.name] || "",
                            isDisabled,
                          )}
                          <span
                            className={`capitalize ${
                              !currentData[input.name] || isDisabled
                                ? "text-slate-400"
                                : "text-slate-800 font-medium"
                            }`}
                          >
                            {currentData[input.name] || "Select an option"}
                          </span>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${isDisabled ? "text-slate-300" : "text-slate-400"} ${openSelect === input.name ? "rotate-180 text-indigo-500" : ""}`}
                        />
                      </button>

                      {openSelect === input.name && !isDisabled && (
                        <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                          {input.options.map((opt: string) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                handleChange(input.name, opt);
                                setOpenSelect(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between group transition-colors ${
                                currentData[input.name] === opt
                                  ? "bg-indigo-50/50"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {getSelectOptionIcon(opt)}
                                <span
                                  className={`capitalize ${
                                    currentData[input.name] === opt
                                      ? "text-indigo-700 font-semibold"
                                      : "text-slate-700 group-hover:text-slate-900"
                                  }`}
                                >
                                  {opt}
                                </span>
                              </div>
                              {currentData[input.name] === opt && (
                                <Check
                                  size={16}
                                  strokeWidth={2.5}
                                  className="text-indigo-600"
                                />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative group/input z-10">
                      {/* Avatar Overlay for Address Text Inputs */}
                      {input.type === "text" && isAddressField && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <AddressAvatar
                            seed={currentData[input.name] || ""}
                            disabled={isDisabled}
                          />
                        </div>
                      )}

                      {input.type === "textarea" ? (
                        <textarea
                          ref={(el) => {
                            if (el) inputRefs.current[input.name] = el;
                          }}
                          disabled={isDisabled}
                          className={`w-full p-3 rounded-xl text-sm h-24 transition-all resize-none font-mono border ${
                            isDisabled
                              ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                              : "bg-white border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 shadow-sm"
                          }`}
                          placeholder={input.placeholder || ""}
                          value={currentData[input.name] || ""}
                          onChange={(e) =>
                            handleChange(input.name, e.target.value)
                          }
                          onKeyDown={(e) => handleKeyDown(e, input.name)}
                        />
                      ) : (
                        <input
                          ref={(el) => {
                            if (el) inputRefs.current[input.name] = el;
                          }}
                          type={input.type}
                          disabled={isDisabled}
                          className={`w-full py-2.5 pr-9 rounded-xl text-sm transition-all font-mono border ${
                            isAddressField ? "pl-10" : "px-3"
                          } ${
                            isDisabled
                              ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                              : "bg-white border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 shadow-sm"
                          }`}
                          placeholder={
                            isDisabled ? "Disabled" : input.placeholder || ""
                          }
                          value={currentData[input.name] || ""}
                          readOnly={input.readOnly}
                          onChange={(e) =>
                            handleChange(input.name, e.target.value)
                          }
                          onKeyDown={(e) => handleKeyDown(e, input.name)}
                        />
                      )}

                      {!input.readOnly &&
                        !isDisabled &&
                        (input.type === "text" ||
                          input.type === "textarea") && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleOpenStandardPicker(input.name);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            title="Insert Variable (Ctrl + Space)"
                          >
                            <Braces size={14} strokeWidth={2.5} />
                          </button>
                        )}
                    </div>
                  )}
                </div>
              );
            })}

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

      <div className="p-4 bg-slate-50 border-t border-gray-100 shrink-0 relative z-10">
        <p className="text-[10px] text-slate-400 leading-relaxed text-center">
          Variables used as{" "}
          <code className="text-indigo-500 font-bold">{"{{ID.Var}}"}</code> are
          automatically resolved during workflow execution.
        </p>
      </div>

      {/* --- REFINED FULL WIDTH BOTTOM SHEET OVERLAY --- */}
      {pickerConfig && (
        <>
          <div
            className="absolute inset-0 z-[90] bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => {
              setPickerConfig(null);
              setExpandedGroup(null);
              setSearchQuery("");
            }}
          />

          <div className="absolute inset-x-0 bottom-0 z-[100] w-full bg-white border-t border-slate-200 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] flex flex-col rounded-t-[1.5rem] animate-in slide-in-from-bottom-12 duration-300 max-h-[85%]">
            <div className="w-full flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>

            <div className="px-5 pb-4 border-b border-slate-100 flex flex-col gap-3 shrink-0">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
                    <Braces size={14} strokeWidth={2.5} />
                  </div>
                  Insert Variable
                </h3>
                <button
                  onClick={() => {
                    setPickerConfig(null);
                    setExpandedGroup(null);
                    setSearchQuery("");
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>

              <div className="relative group">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
                />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search variables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-3 pb-6 custom-scrollbar">
              {filteredGroups.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                    <Search size={20} className="text-slate-300" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-slate-600">
                      No variables found
                    </span>
                    <span className="text-xs text-slate-400">
                      Try adjusting your search terms.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredGroups.map((group) => {
                    const isExpanded =
                      searchQuery.length > 0 || expandedGroup === group.id;

                    return (
                      <div
                        key={group.id}
                        className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm transition-all"
                      >
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            if (!searchQuery) {
                              setExpandedGroup(isExpanded ? null : group.id);
                            }
                          }}
                          className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                            isExpanded
                              ? "bg-slate-50/80 border-b border-slate-100"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div
                              className={`p-1.5 rounded-lg shrink-0 shadow-sm ${
                                group.icon === "sheet"
                                  ? "bg-emerald-100 text-emerald-600"
                                  : "bg-white border border-slate-200 text-indigo-600"
                              }`}
                            >
                              {group.icon === "sheet" ? (
                                <Database size={14} />
                              ) : (
                                <Cpu size={14} />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-slate-700 truncate">
                                {group.label}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 truncate">
                                {group.variables.length} Variable
                                {group.variables.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                          {!searchQuery && (
                            <ChevronRight
                              size={16}
                              className={`transition-transform duration-200 ${
                                isExpanded
                                  ? "rotate-90 text-indigo-500"
                                  : "text-slate-300"
                              }`}
                            />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="p-1.5 bg-white">
                            {group.variables.map((v: any, vIdx: number) => (
                              <button
                                key={vIdx}
                                onClick={(e) => {
                                  e.preventDefault();
                                  pickerConfig.onInsert(v.name, v.nodeId);
                                }}
                                className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 rounded-lg flex flex-col group/var transition-all"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-700 font-mono truncate group-hover/var:text-indigo-600">
                                    {v.name}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-500 truncate mt-0.5 group-hover/var:text-indigo-400/80">
                                  {v.desc}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
