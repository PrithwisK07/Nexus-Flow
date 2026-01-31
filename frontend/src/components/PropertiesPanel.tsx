import React from "react";
import { X, Settings } from "lucide-react";
import { NODE_TYPES, CATEGORY_COLORS } from "@/lib/nodeConfig";

export default function PropertiesPanel({
  selectedNode,
  updateData,
  onClose,
}: any) {
  const type = selectedNode.data.type;
  // Fallback to avoid crashes if type is missing
  const config = NODE_TYPES[type] || NODE_TYPES["math_operation"] || {};
  const colors = CATEGORY_COLORS[config.category] || CATEGORY_COLORS.logic;
  const currentData = selectedNode.data.config || {};

  const handleChange = (field: string, value: any) => {
    updateData(selectedNode.id, { [field]: value });
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 h-full flex flex-col shadow-2xl z-30 animate-in slide-in-from-right duration-300">
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
              <div key={input.name} className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">
                  {input.label}
                </label>

                {input.type === "select" ? (
                  <select
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
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
                ) : input.type === "textarea" ? (
                  <textarea
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-slate-900 h-24 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none shadow-sm placeholder:text-slate-400"
                    placeholder={input.placeholder || "Enter details..."}
                    value={currentData[input.name] || ""}
                    onChange={(e) => handleChange(input.name, e.target.value)}
                  />
                ) : (
                  <input
                    type={input.type}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm placeholder:text-slate-400"
                    placeholder={input.placeholder || ""}
                    value={currentData[input.name] || ""}
                    readOnly={input.readOnly} // Ensure your config doesn't set this to true unless needed
                    onChange={(e) => handleChange(input.name, e.target.value)}
                  />
                )}

                {input.placeholder && input.placeholder.includes("{{") && (
                  <p className="text-[10px] text-slate-500 font-medium">
                    Supports variables like{" "}
                    <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600">
                      {"{{Output}}"}
                    </code>
                  </p>
                )}
              </div>
            ))}

          {(!config.inputs || config.inputs.length === 0) && (
            <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-gray-200">
              <p className="text-sm text-slate-400">
                No configuration options available for this node.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
