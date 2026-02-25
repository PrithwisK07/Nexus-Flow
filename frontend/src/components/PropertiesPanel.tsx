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

// --- Generic Icon Mapper ---
const getSelectOptionIcon = (opt: string, disabled: boolean = false) => {
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
        style={{ width: "18px", height: "18px" }}
      />
    );
  }

  const IconProps = {
    size: 16,
    className: disabled ? "text-slate-300" : "text-indigo-500",
  };

  switch (opt?.toLowerCase()) {
    case "custom": return <Coins {...IconProps} />;
    case "add": return <Plus {...IconProps} />;
    case "subtract": return <Minus {...IconProps} />;
    case "multiply": return <X {...IconProps} />;
    case "divide": return <Divide {...IconProps} />;
    case "percent": return <Percent {...IconProps} />;
    case "get": return <Search {...IconProps} />;
    case "post": return <Send {...IconProps} />;
    case "put": return <FileText {...IconProps} />;
    case "delete": return <Trash2 {...IconProps} />;
    case "upper":
    case "lower": return <Type {...IconProps} />;
    case "replace": return <ArrowRightLeft {...IconProps} />;
    case "parse_number": return <Hash {...IconProps} />;
    case "interval": return <Clock {...IconProps} />;
    case "cron": return <CalendarClock {...IconProps} />;
    case "bullet points": return <List {...IconProps} />;
    case "paragraph": return <AlignLeft {...IconProps} />;
    case "tldr": return <Zap {...IconProps} />;
    case "tweet": return <MessageCircle {...IconProps} />;
    case "short":
    case "medium":
    case "long": return <Ruler {...IconProps} />;
    case "true":
    case "false": return <Check {...IconProps} />;
    default:
      return <div className={`w-1.5 h-1.5 rounded-full ml-1 ${disabled ? "bg-slate-200" : "bg-indigo-300"}`} />;
  }
};

const AddressAvatar = ({ seed, disabled }: { seed: string; disabled: boolean }) => {
  if (!seed) return <div className={`w-5 h-5 rounded-full bg-slate-100 border border-slate-200 ${disabled ? "opacity-50" : ""}`} />;
  if (seed.includes("{{")) {
    return (
      <div className={`w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 ${disabled ? "opacity-50 grayscale" : ""}`}>
        <Braces size={10} strokeWidth={3} />
      </div>
    );
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const h1 = Math.abs(hash) % 360;
  const h2 = Math.abs(hash * 13) % 360;
  return (
    <div className={`w-5 h-5 rounded-full shadow-inner ${disabled ? "opacity-40 grayscale" : ""}`} style={{ background: `linear-gradient(135deg, hsl(${h1}, 80%, 65%), hsl(${h2}, 80%, 75%))` }} />
  );
};

export default function PropertiesPanel({ selectedNode, updateData, onClose, globalSettings, nodes }: any) {
  const type = selectedNode.data.type;
  const config = NODE_TYPES[type] || {};
  const colors = CATEGORY_COLORS[config.category] || CATEGORY_COLORS.logic;
  const currentData = selectedNode.data.config || {};

  const [pickerConfig, setPickerConfig] = useState<any>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const [selectSearch, setSelectSearch] = useState("");

  const inputRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPickerConfig(null);
        setOpenSelect(null);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleChange = (field: string, value: any) => {
    updateData(selectedNode.id, { [field]: value });
  };

  const isInputDisabled = (inputName: string) => {
    if (inputName === "customTokenIn") return currentData["tokenIn"] !== "Custom";
    if (inputName === "customTokenOut") return currentData["tokenOut"] !== "Custom";
    if (inputName === "customToken") return currentData["token"] !== "Custom";
    return false;
  };

  const handleOpenStandardPicker = (fieldName: string) => {
    if (isInputDisabled(fieldName)) return;
    const el = inputRefs.current[fieldName];
    const pos = el?.selectionStart || (currentData[fieldName] || "").length;

    setPickerConfig({
      onInsert: (varName: string, nodeId?: string) => {
        const formatted = nodeId ? `{{${nodeId}.${varName}}}` : `{{${varName}}}`;
        const currentValue = currentData[fieldName] || "";
        handleChange(fieldName, `${currentValue.slice(0, pos)}${formatted}${currentValue.slice(pos)}`);
        setPickerConfig(null);
      },
    });
  };

  const getAvailableVariables = () => {
    const groups: Record<string, any> = {};
    nodes.forEach((node: any) => {
      if (node.id === selectedNode.id) return;
      const nodeConfig = NODE_TYPES[node.data.type];
      if (nodeConfig?.outputs) {
        nodeConfig.outputs.forEach((out: any) => {
          if (!groups[node.id]) groups[node.id] = { id: node.id, label: node.data.label || nodeConfig.label, variables: [] };
          groups[node.id].variables.push({ name: out.name, nodeId: node.id, desc: out.desc });
        });
      }
    });
    return Object.values(groups);
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 h-full flex flex-col shadow-2xl z-30 relative overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.bg}`}>{React.createElement(config.icon, { size: 18, className: colors.text })}</div>
          <div>
            <h2 className="font-bold text-slate-800">{config.label}</h2>
            <p className="text-xs text-slate-400 font-mono">{selectedNode.data.label}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
      </div>

      <div className="p-6 overflow-y-auto flex-1 space-y-6 pb-32">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Settings size={14} /> Configuration</h3>
          
          {config.inputs?.map((input: any) => {
            const isDisabled = isInputDisabled(input.name);
            const isAddressField = ["address", "recipient", "contract"].some(k => input.name.toLowerCase().includes(k));

            return (
              <div key={input.name} className="space-y-1.5 relative group">
                <label className={`text-sm font-bold ${isDisabled ? "text-slate-400" : "text-slate-700"}`}>{input.label}</label>
                
                {input.type === "select" ? (
                  <div className="relative">
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        setOpenSelect(openSelect === input.name ? null : input.name);
                        setSelectSearch("");
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm flex items-center justify-between border ${isDisabled ? "bg-slate-50 cursor-not-allowed" : "bg-white border-slate-200"}`}
                    >
                      <span className={!currentData[input.name] ? "text-slate-400" : "text-slate-800 font-medium"}>
                        {currentData[input.name] || "Select or type..."}
                      </span>
                      <ChevronDown size={16} className={openSelect === input.name ? "rotate-180" : ""} />
                    </button>

                    {openSelect === input.name && (
                      <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                        <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                          <Search size={14} className="text-slate-400" />
                          <input
                            autoFocus
                            className="w-full bg-transparent text-sm outline-none"
                            placeholder="Type to search or add custom..."
                            value={selectSearch}
                            onChange={(e) => {
                              setSelectSearch(e.target.value);
                              handleChange(input.name, e.target.value); // Dynamic typing update
                            }}
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {input.options
                            .filter((opt: string) => opt.toLowerCase().includes(selectSearch.toLowerCase()))
                            .map((opt: string) => (
                              <button
                                key={opt}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex items-center justify-between"
                                onClick={() => {
                                  handleChange(input.name, opt);
                                  setOpenSelect(null);
                                }}
                              >
                                {opt}
                                {currentData[input.name] === opt && <Check size={14} className="text-indigo-600" />}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    {input.type === "textarea" ? (
                      <textarea
                        className="w-full p-3 rounded-xl text-sm h-24 font-mono border border-slate-200"
                        value={currentData[input.name] || ""}
                        onChange={(e) => handleChange(input.name, e.target.value)}
                      />
                    ) : (
                      <input
                        type={input.type}
                        className={`w-full py-2.5 px-3 rounded-xl text-sm font-mono border border-slate-200 ${isAddressField ? "pl-10" : ""}`}
                        value={currentData[input.name] || ""}
                        onChange={(e) => handleChange(input.name, e.target.value)}
                      />
                    )}
                    <button 
                      onClick={() => handleOpenStandardPicker(input.name)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600"
                    >
                      <Braces size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {pickerConfig && (
        <div className="absolute inset-x-0 bottom-0 bg-white border-t p-4 z-[100] shadow-2xl rounded-t-3xl max-h-[60%] overflow-y-auto">
          <div className="flex justify-between mb-4">
            <h3 className="font-bold text-sm">Select Variable</h3>
            <button onClick={() => setPickerConfig(null)}><X size={16} /></button>
          </div>
          {getAvailableVariables().map((group: any) => (
            <div key={group.id} className="mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{group.label}</p>
              {group.variables.map((v: any) => (
                <button 
                  key={v.name}
                  className="w-full text-left p-2 text-xs hover:bg-indigo-50 rounded"
                  onClick={() => pickerConfig.onInsert(v.name, v.nodeId)}
                >
                  {v.name} - <span className="text-slate-400">{v.desc}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}