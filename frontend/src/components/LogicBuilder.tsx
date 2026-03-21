import React, { useRef } from "react";
import { Plus, Trash2, GitMerge, Braces } from "lucide-react";

type Operator = ">" | "<" | "==" | "!=" | "contains" | "is_empty";
type LogicRule = { valueA: string; operator: Operator; valueB: string };
type RuleGroup = { combinator: "AND" | "OR"; rules: (LogicRule | RuleGroup)[] };

interface LogicBuilderProps {
  value: RuleGroup;
  onChange: (val: RuleGroup) => void;
  onOpenPicker: (onInsert: (varName: string, nodeId?: string) => void) => void;
}

export default function LogicBuilder({
  value,
  onChange,
  onOpenPicker,
}: LogicBuilderProps) {
  if (!value || !value.rules) value = { combinator: "AND", rules: [] };

  const updateGroup = (newGroup: RuleGroup) => onChange(newGroup);

  const addRule = () => {
    updateGroup({
      ...value,
      rules: [
        ...value.rules,
        { valueA: "", operator: "==", valueB: "" } as LogicRule,
      ],
    });
  };

  const addGroup = () => {
    updateGroup({
      ...value,
      rules: [...value.rules, { combinator: "AND", rules: [] } as RuleGroup],
    });
  };

  const removeIndex = (index: number) => {
    updateGroup({ ...value, rules: value.rules.filter((_, i) => i !== index) });
  };

  const updateIndex = (index: number, item: LogicRule | RuleGroup) => {
    const newRules = [...value.rules];
    newRules[index] = item;
    updateGroup({ ...value, rules: newRules });
  };

  const toggleCombinator = () => {
    updateGroup({
      ...value,
      combinator: value.combinator === "AND" ? "OR" : "AND",
    });
  };

  return (
    <div className="flex flex-col gap-2 p-3 max-sm:p-2 bg-slate-50 border border-slate-200 rounded-lg">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleCombinator}
          className={`px-3 py-1 text-xs font-bold rounded shadow-sm transition-all ${
            value.combinator === "AND"
              ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          }`}
        >
          {value.combinator}
        </button>
      </div>

      {/* 🟢 MODIFIED: Reduced left padding on mobile to prevent nesting overflow */}
      <div className="flex flex-col gap-2 pl-3 max-sm:pl-1.5 border-l-2 border-slate-200/50 mt-1">
        {value.rules.map((rule, idx) => (
          <div key={idx} className="relative group">
            {"combinator" in rule ? (
              <div className="relative">
                <LogicBuilder
                  value={rule as RuleGroup}
                  onChange={(val) => updateIndex(idx, val)}
                  onOpenPicker={onOpenPicker}
                />
                <button
                  onClick={() => removeIndex(idx)}
                  className="absolute -right-2 -top-2 p-1 bg-white shadow-sm border rounded-full text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 max-lg:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              // 🟢 MODIFIED: Added max-sm:flex-wrap
              <div className="flex items-center gap-2 max-sm:flex-wrap max-sm:gap-1.5 bg-white p-2 border border-slate-200 rounded shadow-sm z-10 relative">
                <VariableInput
                  value={(rule as LogicRule).valueA}
                  onChange={(v: string) =>
                    updateIndex(idx, { ...rule, valueA: v } as LogicRule)
                  }
                  onOpenPicker={onOpenPicker}
                  placeholder="Var A"
                />

                <select
                  className="text-xs bg-slate-50 border-none rounded font-bold text-slate-600 focus:ring-0 cursor-pointer w-16 shrink-0"
                  value={(rule as LogicRule).operator}
                  onChange={(e) =>
                    updateIndex(idx, {
                      ...rule,
                      operator: e.target.value as any,
                    } as LogicRule)
                  }
                >
                  <option value="==">==</option>
                  <option value="!=">!=</option>
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value="contains">has</option>
                  <option value="is_empty">empty</option>
                </select>

                <VariableInput
                  value={(rule as LogicRule).valueB}
                  onChange={(v: string) =>
                    updateIndex(idx, { ...rule, valueB: v } as LogicRule)
                  }
                  onOpenPicker={onOpenPicker}
                  placeholder="Value"
                />

                <button
                  onClick={() => removeIndex(idx)}
                  className="text-slate-300 hover:text-red-500 p-1 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-1">
        <button
          onClick={addRule}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
        >
          <Plus size={12} /> Rule
        </button>
        <button
          onClick={addGroup}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
        >
          <GitMerge size={12} /> Group
        </button>
      </div>
    </div>
  );
}

const VariableInput = ({ value, onChange, onOpenPicker, placeholder }: any) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const triggerPicker = () => {
    const pos = inputRef.current?.selectionStart || (value || "").length;

    onOpenPicker((varName: string, nodeId?: string) => {
      const formatted = nodeId ? `{{${nodeId}.${varName}}}` : `{{${varName}}}`;
      const safeValue = value || "";

      const before = safeValue.slice(0, pos);
      const after = safeValue.slice(pos);
      onChange(`${before}${formatted}${after}`);

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newPos = pos + formatted.length;
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey && e.code === "Space") {
      e.preventDefault();
      triggerPicker();
    }
  };

  return (
    // 🟢 MODIFIED: min-w-[80px] for tighter mobile layouts
    <div className="relative flex-1 min-w-[100px] max-sm:min-w-[80px] group/input">
      <input
        ref={inputRef}
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full text-xs p-1.5 pr-6 bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 focus:outline-none font-mono text-slate-700 transition-colors"
      />

      <button
        onClick={(e) => {
          e.preventDefault();
          triggerPicker();
        }}
        className="absolute right-0 top-1 p-0.5 rounded transition-colors text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
        title="Insert Variable"
      >
        <Braces size={12} />
      </button>

      {!value && (
        <div className="absolute right-6 top-1.5 text-[9px] text-slate-300 pointer-events-none opacity-0 group-hover/input:opacity-100 max-lg:hidden transition-opacity font-sans">
          Ctrl+Space
        </div>
      )}
    </div>
  );
};
