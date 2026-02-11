import { useState } from "react";
import { Node, Edge, useReactFlow } from "reactflow";

export const useDeployment = () => {
  const [isDeploying, setIsDeploying] = useState(false);
  const { getNodes, getEdges } = useReactFlow();

  const deploy = async (workflowName: string, globalSettings: any) => {
    setIsDeploying(true);
    const nodes = getNodes();
    const edges = getEdges();

    try {
      // 1. Calculate In-Degree
      // This counts how many incoming edges each node has.
      // Used to identify "Merge Nodes" (In-Degree > 1).
      const inDegree = new Map<string, number>();
      edges.forEach((e) => {
        inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      });

      // 2. Find Trigger
      const triggerNode = nodes.find((n) =>
        ["webhook", "timer", "sheets", "read_rss"].includes(n.data.type),
      );

      if (!triggerNode) {
        throw new Error("No Trigger Node found.");
      }

      // 3. Recursive Builder (Fan-Out / Fan-In Logic)
      const buildSegment = (
        startId: string,
        visited: Set<string>,
      ): { actions: any[]; stoppedAt: string | null } => {
        const segmentActions = [];
        let currentId: string | undefined = startId;
        let justResolvedMerge = false; // Flag to bypass stop check after successful merge

        while (currentId) {
          if (visited.has(currentId)) break;

          // --- MERGE BARRIER CHECK ---
          // If a node has multiple inputs, it's a Merge Point.
          // Rule: If we just jumped here from a resolved parallel block, proceed.
          // Otherwise, STOP. This allows the parent scope to detect the stop and handle the merge.
          const isMergePoint = (inDegree.get(currentId) || 0) > 1;
          const isStart = currentId === startId;

          if (isMergePoint && !isStart && !justResolvedMerge) {
            return { actions: segmentActions, stoppedAt: currentId };
          }

          // Reset flag after check
          justResolvedMerge = false;

          visited.add(currentId);
          const node = nodes.find((n) => n.id === currentId);
          if (!node) break;

          // A. CONDITION NODE (If/Else)
          if (node.data.type === "condition") {
            const trueEdge = edges.find(
              (e) => e.source === node.id && e.sourceHandle === "true",
            );
            const falseEdge = edges.find(
              (e) => e.source === node.id && e.sourceHandle === "false",
            );

            const trueResult = trueEdge
              ? buildSegment(trueEdge.target, new Set(visited))
              : { actions: [], stoppedAt: null };
            const falseResult = falseEdge
              ? buildSegment(falseEdge.target, new Set(visited))
              : { actions: [], stoppedAt: null };

            segmentActions.push({
              id: node.id,
              type: "condition",
              inputs: { ...node.data.config },
              trueRoutes: trueResult.actions,
              falseRoutes: falseResult.actions,
            });

            // Conditions branch permanently in this model (unless complex merge logic added)
            return { actions: segmentActions, stoppedAt: null };
          }

          // B. NORMAL ACTION
          // We add the action to the list (unless it's the trigger itself)
          if (!["webhook", "sheets", "timer"].includes(node.data.type)) {
            segmentActions.push({
              id: node.id,
              type: node.data.type,
              inputs: { ...node.data.config },
            });
          }

          // C. TRAVERSAL
          const outgoing = edges.filter((e) => e.source === currentId);

          if (outgoing.length === 0) {
            currentId = undefined; // End of Flow
          } else if (outgoing.length === 1) {
            currentId = outgoing[0].target; // Linear Flow
          } else {
            // D. PARALLEL SPLIT (Fan-Out)
            const branches = outgoing.map((edge) =>
              buildSegment(edge.target, new Set(visited)),
            );

            segmentActions.push({
              id: `parallel_${node.id}`,
              type: "parallel",
              branches: branches.map((r) => r.actions),
            });

            // E. MERGE DETECTION (Fan-In)
            // Check if all branches stopped at the SAME node ID
            const stopPoints = branches
              .map((r) => r.stoppedAt)
              .filter((id) => id !== null);
            const uniqueStops = [...new Set(stopPoints)];

            // If we have valid branches and they all hit the exact same barrier
            if (stopPoints.length > 0 && uniqueStops.length === 1) {
              // RESUME MAIN CHAIN
              currentId = uniqueStops[0];
              justResolvedMerge = true; // Signal next loop to allow processing this node
            } else {
              // Diverged or ended
              currentId = undefined;
            }
          }
        }

        return { actions: segmentActions, stoppedAt: null };
      };

      // 4. Build Payload
      const rootResult = buildSegment(triggerNode.id, new Set());

      const payload = {
        config: {
          spreadsheetId: globalSettings.spreadsheetId || null,
          columnMapping: globalSettings.columnMapping || {},
          trigger: {
            type: triggerNode.data.type,
            ...triggerNode.data.config,
          },
          actions: rootResult.actions,
        },
        context: { TEST_USER: "Frontend_Deploy" },
      };

      console.log("🚀 Payload:", JSON.stringify(payload, null, 2));

      // 5. Send to Producer API
      const response = await fetch("http://localhost:3001/trigger-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Server Error");

      return { success: true, data: result };
    } catch (error: any) {
      console.error("Deployment Error:", error);
      return { success: false, error: error.message };
    } finally {
      setIsDeploying(false);
    }
  };

  return { deploy, isDeploying };
};
