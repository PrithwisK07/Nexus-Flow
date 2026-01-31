"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  ReactFlowProvider,
  Node,
  useReactFlow,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

import { Settings, Play, Save, Layers, Plus, Search } from "lucide-react";
import NexusNode from "@/components/flow/NexusNode";
import { NODE_TYPES, CATEGORY_COLORS } from "@/lib/nodeConfig";
import PropertiesPanel from "../components/PropertiesPanel";
import ContextMenu from "../components/flow/ContextMenu";

// Register custom node types
const nodeTypes = { nexusNode: NexusNode };

const INITIAL_NODES = [
  {
    id: "1",
    type: "nexusNode",
    position: { x: 100, y: 100 },
    data: {
      type: "webhook",
      label: "TRIG-01",
      config: { description: "Webhook In" },
    },
  },
];

export default function NexusFlowPage() {
  return (
    <ReactFlowProvider>
      <NexusCanvas />
    </ReactFlowProvider>
  );
}

function NexusCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [menu, setMenu] = useState<any>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Search State
  const [searchTerm, setSearchTerm] = useState("");

  // --- Global Canvas Settings State ---
  const [defaultEdgeType, setDefaultEdgeType] = useState<
    "smoothstep" | "default" | "straight"
  >("smoothstep");
  const [defaultEdgePattern, setDefaultEdgePattern] = useState<
    "solid" | "dashed" | "dotted"
  >("solid");

  const onPaneClick = useCallback(() => {
    setMenu(null);
  }, [setMenu]);

  // --- Handlers ---
  const onConnect = useCallback(
    (params: Connection | Edge) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            type: defaultEdgeType, // Use current global default
            style: {
              stroke: "#6366f1",
              strokeWidth: 2,
              strokeDasharray:
                defaultEdgePattern === "dashed"
                  ? "5,5"
                  : defaultEdgePattern === "dotted"
                    ? "2,2"
                    : "0",
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#6366f1",
            },
          },
          eds,
        ),
      );
    },
    [setEdges, defaultEdgeType, defaultEdgePattern],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const pane = reactFlowWrapper.current?.getBoundingClientRect();

      if (pane) {
        setMenu({
          id: node.id,
          type: "node",
          top: event.clientY - pane.top,
          left: event.clientX - pane.left,
        });
      }
    },
    [setMenu],
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      const pane = reactFlowWrapper.current?.getBoundingClientRect();

      if (pane) {
        setMenu({
          id: edge.id,
          type: "edge",
          data: { type: edge.type, style: edge.style },
          top: event.clientY - pane.top,
          left: event.clientX - pane.left,
        });
      }
    },
    [setMenu],
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const pane = reactFlowWrapper.current?.getBoundingClientRect();

      if (pane) {
        setMenu({
          id: "pane-menu",
          type: "pane",
          top: event.clientY - pane.top,
          left: event.clientX - pane.left,
        });
      }
    },
    [setMenu],
  );

  const duplicateNode = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const position = { x: node.position.x + 20, y: node.position.y + 20 };
    const newNode = {
      ...node,
      id: `${node.type}_${Date.now()}`,
      position,
      data: { ...node.data, label: `${node.data.label} (Copy)` },
      selected: true,
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const onDragStart = (event: React.DragEvent, type: string) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    event.dataTransfer.setDragImage(target, rect.width / 2, rect.height / 2);
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const centeredPosition = {
        x: position.x - 120,
        y: position.y - 40,
      };

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: "nexusNode",
        position: centeredPosition,
        data: {
          type,
          label: `NODE-${nodes.length + 1}`,
          config: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [nodes, setNodes, screenToFlowPosition],
  );

  const onAddNode = (type: string) => {
    const wrapper = reactFlowWrapper.current?.getBoundingClientRect();
    if (wrapper) {
      const centerX = wrapper.left + wrapper.width / 2;
      const centerY = wrapper.top + wrapper.height / 2;
      const position = screenToFlowPosition({ x: centerX, y: centerY });
      const snappedX = Math.round(position.x / 20) * 20;
      const snappedY = Math.round(position.y / 20) * 20;

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: "nexusNode",
        position: { x: snappedX, y: snappedY },
        data: {
          type,
          label: `NODE-${nodes.length + 1}`,
          config: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
    }
  };

  const updateEdgeStyle = (edgeId: string, type: any, pattern: any) => {
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === edgeId) {
          return {
            ...e,
            type: type || e.type,
            style: {
              ...e.style,
              strokeDasharray:
                pattern === "dashed"
                  ? "5,5"
                  : pattern === "dotted"
                    ? "2,2"
                    : "0",
            },
          };
        }
        return e;
      }),
    );
    // Auto-save preference
    if (type) setDefaultEdgeType(type);
    if (pattern) setDefaultEdgePattern(pattern);
  };

  const updateGlobalDefaults = (type: any, pattern: any) => {
    if (type) setDefaultEdgeType(type);
    if (pattern) setDefaultEdgePattern(pattern);
  };

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const updateNodeData = (id: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, config: { ...node.data.config, ...newData } },
          };
        }
        return node;
      }),
    );
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden">
      {/* LEFT SIDEBAR */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col z-20 shadow-sm">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
            <Layers size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800 tracking-tight">
              Nexus Flow
            </h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              Orchestration
            </p>
          </div>
        </div>

        <div className="p-4 pb-0">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search nodes..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {["trigger", "web3", "data", "logic", "notify"].map((cat) => {
            // 1. Filter Nodes based on Search Term
            const categoryNodes = Object.entries(NODE_TYPES).filter(
              ([type, config]) =>
                config.category === cat &&
                config.label.toLowerCase().includes(searchTerm.toLowerCase()),
            );

            // 2. If no nodes match in this category, hide the category
            if (categoryNodes.length === 0) return null;

            return (
              <div key={cat}>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </h3>
                <div className="space-y-2">
                  {categoryNodes.map(([type, config]) => (
                    <div
                      key={type}
                      onClick={() => onAddNode(type)}
                      className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group active:scale-95"
                      draggable
                      onDragStart={(event) => onDragStart(event, type)}
                    >
                      <div
                        className={`p-2 rounded-lg ${CATEGORY_COLORS[cat].bg}`}
                      >
                        {React.createElement(config.icon, {
                          size: 16,
                          className: CATEGORY_COLORS[cat].text,
                        })}
                      </div>
                      <span className="text-sm font-medium text-slate-600 group-hover:text-indigo-600">
                        {config.label}
                      </span>
                      <Plus
                        size={14}
                        className="ml-auto text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN CANVAS */}
      <div className="flex-1 flex flex-col relative h-full">
        {/* Top Header */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">
              Workflow /{" "}
              <span className="text-slate-800 font-semibold">
                Payroll Strategy
              </span>
            </span>
          </div>
          <div className="flex gap-3 relative">
            <button className="flex items-center gap-2 px-4 py-2 text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors">
              <Save size={16} /> Save
            </button>
            <button
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all transform hover:scale-105"
              onClick={() => console.log(JSON.stringify(nodes, null, 2))}
            >
              <Play size={16} /> Deploy
            </button>
          </div>
        </div>

        {/* React Flow Wrapper */}
        <div
          className="flex-1 relative bg-slate-50"
          ref={reactFlowWrapper}
          style={{
            backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          <ReactFlow
            ref={ref}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            onPaneClick={onPaneClick}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeContextMenu={onEdgeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            fitView
            snapToGrid={true}
            snapGrid={[20, 20]}
          >
            <Controls className="!bg-white !border-gray-200 !shadow-lg !rounded-lg" />
            {menu && (
              <ContextMenu
                onClick={onPaneClick}
                {...menu}
                onClose={() => setMenu(null)}
                onDuplicate={duplicateNode}
                onEdgeUpdate={updateEdgeStyle}
                onGlobalUpdate={updateGlobalDefaults}
                globalDefaults={{
                  type: defaultEdgeType,
                  pattern: defaultEdgePattern,
                }}
              />
            )}
          </ReactFlow>
        </div>
      </div>

      {/* RIGHT PROPERTIES PANEL */}
      {selectedNode && (
        <PropertiesPanel
          selectedNode={selectedNode}
          updateData={updateNodeData}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  );
}
