import React, { useState } from "react";
import { X, Save, Plus, Trash2, Columns } from "lucide-react";

export default function SettingsModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: any) {
  // 🟢 Removed 'name' to prevent state conflicts with the Top Bar inline editor
  const [data, setData] = useState({
    spreadsheetId: initialData?.spreadsheetId || "",
    columnMapping: initialData?.columnMapping || {},
  });

  const [mappings, setMappings] = useState<{ col: string; var: string }[]>(
    Object.entries(initialData?.columnMapping || {}).map(([k, v]) => ({
      col: k,
      var: v as string,
    })),
  );

  const handleSave = () => {
    const mapObj = mappings.reduce(
      (acc, item) => {
        if (item.col !== "" && item.var !== "") acc[item.col] = item.var;
        return acc;
      },
      {} as Record<string, string>,
    );

    onSave({ ...data, columnMapping: mapObj });
  };

  const addMapping = () => setMappings([...mappings, { col: "0", var: "" }]);

  const removeMapping = (idx: number) => {
    const newM = [...mappings];
    newM.splice(idx, 1);
    setMappings(newM);
  };

  const updateMapping = (idx: number, field: "col" | "var", value: string) => {
    const newM = [...mappings];
    newM[idx][field] = value;
    setMappings(newM);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[500px] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 max-sm:p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <Columns size={18} />
            </div>
            <h2 className="font-bold text-slate-800">Workflow Settings</h2>
          </div>
          <button onClick={onClose}>
            <X size={20} className="text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-sm:p-4 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Google Sheet ID
              </label>
              <input
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                placeholder="1BxiMVs0XRA5nFMd..."
                value={data.spreadsheetId || ""}
                onChange={(e) =>
                  setData({ ...data, spreadsheetId: e.target.value })
                }
              />
              <p className="text-[10px] text-slate-400">
                Required if using Google Sheet Trigger or Update Node.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                Variable Mapping
              </label>
              <button
                onClick={addMapping}
                className="text-indigo-600 text-xs font-bold flex items-center gap-1 hover:bg-indigo-50 px-3 py-1.5 rounded transition-colors"
              >
                <Plus size={14} /> Map Column
              </button>
            </div>

            <div className="space-y-3">
              {mappings.length === 0 && (
                <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-gray-200 text-slate-400 text-xs">
                  No columns mapped. Data will be available as{" "}
                  <code className="bg-white px-1 border rounded">Column_A</code>
                  ,{" "}
                  <code className="bg-white px-1 border rounded">Column_B</code>{" "}
                  etc.
                </div>
              )}

              {mappings.map((m, i) => (
                <div
                  key={i}
                  className="flex gap-3 items-center group max-sm:flex-wrap max-sm:bg-slate-50 max-sm:p-3 max-sm:rounded-lg max-sm:border max-sm:border-slate-100"
                >
                  <div className="w-32 max-sm:w-full shrink-0">
                    <select
                      className="w-full p-2 bg-slate-50 max-sm:bg-white border border-gray-200 rounded-lg text-sm text-slate-900 outline-none focus:border-indigo-500"
                      value={m.col}
                      onChange={(e) => updateMapping(i, "col", e.target.value)}
                    >
                      {Array.from({ length: 26 }, (_, k) => (
                        <option key={k} value={k}>
                          {String.fromCharCode(65 + k)} (Col {k})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-slate-300 max-sm:hidden">→</div>

                  <div className="flex-1 max-sm:w-full flex items-center gap-2">
                    <input
                      className="w-full p-2 border border-gray-200 rounded-lg text-sm text-slate-900 outline-none focus:border-indigo-500 placeholder:text-slate-300 font-mono"
                      placeholder="e.g. WalletAddress"
                      value={m.var || ""}
                      onChange={(e) => updateMapping(i, "var", e.target.value)}
                    />

                    <button
                      onClick={() => removeMapping(i)}
                      className="text-slate-300 hover:text-red-500 p-2 transition-colors opacity-0 group-hover:opacity-100 max-sm:opacity-100 shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-700 text-xs flex gap-2">
              <span className="font-bold">Tip:</span>
              <span>
                Map <b>Column A</b> to <code>Wallet</code>. Then use{" "}
                <code>{"{{Wallet}}"}</code> in any node input field.
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 max-sm:p-4 bg-slate-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSave}
            className="bg-indigo-600 max-sm:w-full max-sm:justify-center text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            <Save size={16} /> Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}