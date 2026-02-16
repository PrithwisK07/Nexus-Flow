import { useState } from "react";
import { Node, Edge, useReactFlow } from "reactflow";

export const useDeployment = () => {
  const [isDeploying, setIsDeploying] = useState(false);
  const { getNodes, getEdges } = useReactFlow();

  // --- SHARED HELPER: BUILDS THE JSON PAYLOAD ---
  // We extract this so both deploy() and hotReload() can use the exact same logic
  const buildWorkflowPayload = (
    nodes: Node[],
    edges: Edge[],
    workflowName: string,
    globalSettings: any,
  ) => {
    // 1. Calculate In-Degree (To identify Merge Nodes)
    const inDegree = new Map<string, number>();
    edges.forEach((e) => {
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    });

    const isMergeNode = (id: string) => (inDegree.get(id) || 0) > 1;

    // 2. Find Trigger
    const triggerNode = nodes.find((n) =>
      ["webhook", "timer", "sheets", "read_rss"].includes(n.data.type),
    );

    if (!triggerNode) throw new Error("No Trigger Node found.");

    // --- RECURSIVE BUILDERS ---
    const buildSegment = (
      startId: string,
      visited: Set<string>,
      stopAtMerge: boolean,
    ): { actions: any[]; stoppedAt: string | null } => {
      const actions: any[] = [];
      let currentId: string | undefined = startId;

      while (currentId) {
        if (visited.has(currentId)) break;

        // A. MERGE STOP CHECK
        if (stopAtMerge && isMergeNode(currentId)) {
          return { actions, stoppedAt: currentId };
        }

        visited.add(currentId);
        const node = nodes.find((n) => n.id === currentId);
        if (!node) break;

        // B. ADD NODE
        if (!["webhook", "sheets", "timer"].includes(node.data.type)) {
          actions.push({
            id: node.id,
            type: node.data.type,
            inputs: { ...node.data.config },
          });
        }

        // C. FIND OUTGOING
        if (node.data.type === "condition") {
          const trueEdges = edges.filter(
            (e) => e.source === node.id && e.sourceHandle === "true",
          );
          const falseEdges = edges.filter(
            (e) => e.source === node.id && e.sourceHandle === "false",
          );

          const trueFlow = buildFlowFromEdges(trueEdges, new Set(visited));
          const falseFlow = buildFlowFromEdges(falseEdges, new Set(visited));

          actions.pop(); // Remove the stub
          actions.push({
            id: node.id,
            type: "condition",
            inputs: { ...node.data.config },
            trueRoutes: trueFlow.actions,
            falseRoutes: falseFlow.actions,
          });

          return { actions, stoppedAt: null };
        }

        // Standard Nodes
        const outgoing = edges.filter((e) => e.source === currentId);

        if (outgoing.length === 0) {
          currentId = undefined; // End
        } else if (outgoing.length === 1) {
          currentId = outgoing[0].target; // Linear continue
        } else {
          // D. PARALLEL SPLIT
          const branches = outgoing.map((edge) =>
            buildSegment(edge.target, new Set(visited), true),
          );

          actions.push({
            type: "parallel",
            branches: branches.map((b) => b.actions),
          });

          // E. RESUME MAIN CHAIN
          const stopPoints = branches
            .map((b) => b.stoppedAt)
            .filter((id) => id !== null);
          const uniqueStops = [...new Set(stopPoints)];

          if (stopPoints.length > 0 && uniqueStops.length === 1) {
            currentId = uniqueStops[0];
          } else {
            currentId = undefined;
          }
        }
      }
      return { actions, stoppedAt: null };
    };

    const buildFlowFromEdges = (
      outgoingEdges: Edge[],
      visited: Set<string>,
    ) => {
      if (outgoingEdges.length === 0) return { actions: [], stoppedAt: null };

      if (outgoingEdges.length > 1) {
        const branches = outgoingEdges.map((edge) =>
          buildSegment(edge.target, new Set(visited), true),
        );
        const stopPoints = branches
          .map((b) => b.stoppedAt)
          .filter((id) => id !== null);
        const uniqueStops = [...new Set(stopPoints)];

        const actions = [
          { type: "parallel", branches: branches.map((b) => b.actions) },
        ];

        if (uniqueStops.length === 1) {
          const continuation = buildSegment(
            uniqueStops[0],
            new Set(visited),
            false,
          );
          return {
            actions: [...actions, ...continuation.actions],
            stoppedAt: null,
          };
        }
        return { actions, stoppedAt: null };
      }

      return buildSegment(outgoingEdges[0].target, visited, false);
    };

    // 3. Build the actions array
    const rootResult = buildSegment(triggerNode.id, new Set(), false);

    // 4. Return the finalized config object
    return {
      workflowName,
      spreadsheetId: globalSettings.spreadsheetId || null,
      columnMapping: globalSettings.columnMapping || {},
      trigger: { type: triggerNode.data.type, ...triggerNode.data.config },
      actions: rootResult.actions,
    };
  };

  // --- EXPORT 1: PRIMARY DEPLOYMENT ---
  const deploy = async (workflowName: string, globalSettings: any) => {
    setIsDeploying(true);
    const nodes = getNodes();
    const edges = getEdges();

    try {
      const config = buildWorkflowPayload(
        nodes,
        edges,
        workflowName,
        globalSettings,
      );

      const payload = {
        config,
        context: { TEST_USER: "Frontend_Deploy" },
      };

      console.log("🚀 Payload:", JSON.stringify(payload, null, 2));

      const response = await fetch("http://localhost:3001/trigger-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Server Error");

      return { success: true, data: result };
    } catch (error: any) {
      console.error(error);
      return { success: false, error: error.message };
    } finally {
      setIsDeploying(false);
    }
  };

  // --- EXPORT 2: SILENT HOT RELOAD ---
  const hotReload = async (
    workflowName: string,
    globalSettings: any,
    activeWorkflowId: string,
  ) => {
    try {
      const nodes = getNodes();
      const edges = getEdges();

      // Quick safety check to avoid throwing errors in the background
      const hasTrigger = nodes.some((n) =>
        ["webhook", "timer", "sheets", "read_rss"].includes(n.data.type),
      );
      if (!hasTrigger) return;

      const config = buildWorkflowPayload(
        nodes,
        edges,
        workflowName,
        globalSettings,
      );

      const payload = {
        workflowId: activeWorkflowId,
        config,
      };

      // Silently push updates to Redis
      await fetch("http://localhost:3001/hot-reload", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Hot reload failed silently:", err);
    }
  };

  return { deploy, hotReload, isDeploying };
};
