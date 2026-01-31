import { useState, useCallback } from 'react';
import { Node, Edge } from 'reactflow';

// Snapshot type
type HistoryItem = {
  nodes: Node[];
  edges: Edge[];
};

export const useUndoRedo = (initialNodes: Node[], initialEdges: Edge[]) => {
  // Past, Present, Future approach
  const [past, setPast] = useState<HistoryItem[]>([]);
  const [future, setFuture] = useState<HistoryItem[]>([]);
  
  // We don't store "present" in state here because React Flow owns the "present". 
  // Instead, we call 'takeSnapshot' whenever the user makes a significant change.

  const takeSnapshot = useCallback((nodes: Node[], edges: Edge[]) => {
    setPast((old) => {
        // Limit history to 50 steps to save memory
        const newPast = [...old, { nodes, edges }];
        if (newPast.length > 50) newPast.shift(); 
        return newPast;
    });
    setFuture([]); // Clear future on new action
  }, []);

  const undo = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    if (past.length === 0) return null;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    setFuture((old) => [{ nodes: currentNodes, edges: currentEdges }, ...old]);

    return previous; // Return state to set in React Flow
  }, [past]);

  const redo = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    if (future.length === 0) return null;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast((old) => [...old, { nodes: currentNodes, edges: currentEdges }]);
    setFuture(newFuture);

    return next;
  }, [future]);

  return { takeSnapshot, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
};