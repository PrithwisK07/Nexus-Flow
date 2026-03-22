import { useState } from "react";
import { Node, Edge, useReactFlow } from "reactflow";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const useDeployment = () => {
  const [isDeploying, setIsDeploying] = useState(false);
  const { getNodes, getEdges } = useReactFlow();

  // --- SHARED HELPER: BUILDS THE JSON PAYLOAD ---
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

        // B. ADD NODE STUB
        if (!["webhook", "sheets", "timer"].includes(node.data.type)) {
          actions.push({
            id: node.id,
            type: node.data.type,
            inputs: { ...node.data.config },
          });
        }

        // C. FIND OUTGOING - CONDITION (IF/ELSE)
        if (node.data.type === "condition") {
          const trueEdges = edges.filter(
            (e) => e.source === node.id && e.sourceHandle === "true",
          );
          const falseEdges = edges.filter(
            (e) => e.source === node.id && e.sourceHandle === "false",
          );

          const trueFlow = buildFlowFromEdges(trueEdges, new Set(visited));
          const falseFlow = buildFlowFromEdges(falseEdges, new Set(visited));

          actions.pop(); // Remove the stub added in step B
          actions.push({
            id: node.id,
            type: "condition",
            inputs: { ...node.data.config },
            trueRoutes: trueFlow.actions,
            falseRoutes: falseFlow.actions,
          });

          return { actions, stoppedAt: null };
        }

        // 🟢 NEW: FIND OUTGOING - MULTI-ROUTER (SWITCH)
        if (node.data.type === "switch_router") {
          const rawRoutes = node.data.config?.routes || "";
          // Extract user routes and always append the fallback "default"
          const routes = [
            ...rawRoutes
              .split(",")
              .map((r: string) => r.trim())
              .filter((r: string) => r.length > 0),
            "default",
          ];

          const routeMap: Record<string, any[]> = {};

          // For every route, find the specific edge connected to that handle ID
          routes.forEach((route) => {
            const routeEdges = edges.filter(
              (e) => e.source === node.id && e.sourceHandle === route,
            );
            const flow = buildFlowFromEdges(routeEdges, new Set(visited));
            routeMap[route] = flow.actions;
          });

          actions.pop(); // Remove the standard node stub added in step B
          actions.push({
            id: node.id,
            type: "switch_router",
            inputs: { ...node.data.config },
            routeMap: routeMap, // Nest the compiled paths inside the routeMap
          });

          return { actions, stoppedAt: null };
        }

        // Standard Linear Nodes
        const outgoing = edges.filter((e) => e.source === currentId);

        if (outgoing.length === 0) {
          currentId = undefined; // End of path
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

          // E. RESUME MAIN CHAIN (Post-Merge)
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

    // 3. Build the actions array starting from the trigger
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
  const deploy = async (
    workflowName: string,
    globalSettings: any,
    previousWorkflowId?: string | null,
  ) => {
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

      const payload: any = {
        config,
        context: { TEST_USER: "Frontend_Deploy" },
      };

      if (previousWorkflowId) {
        payload.previousWorkflowId = previousWorkflowId;
      }

      console.log("🚀 Payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_BASE_URL}/trigger-workflow`, {
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
      await fetch(`${API_BASE_URL}/hot-reload`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Hot reload failed silently:", err);
    }
  };

  // --- EXPORT 3: MANUAL RUN ("Run Now") ---
  const runNow = async (workflowName: string, globalSettings: any) => {
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
        isTestRun: true,
        config,
        context: {
          TEST_USER: "Frontend_Manual_Run",
          // Injecting mock payload to prevent Webhook variable resolution from crashing
          WebhookBody: {
            test: true,
            amount: 100,
            email: "test@example.com",
            message: "Manual Test Run",
          },
        },
      };

      const response = await fetch(`${API_BASE_URL}/trigger-workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Server Error");

      return { success: true, ...result };
    } catch (error: any) {
      console.error(error);
      return { success: false, error: error.message };
    } finally {
      setIsDeploying(false);
    }
  };

  return { deploy, hotReload, runNow, isDeploying };
};
