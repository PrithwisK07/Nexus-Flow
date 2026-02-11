import { type ExecutionContext } from "../variableResolver.js";

export const mergeNode = async (inputs: any, context: ExecutionContext) => {
    // 1. Logic Check: Verify we actually have data from branches
    // This is mostly for debugging to ensure the parallel block worked
    const keys = Object.keys(context);
    const hasBranchData = keys.some(k => k.startsWith('node_'));

    console.log(`   🛑 Merge Node: Synchronization Barrier Reached.`);
    
    if (hasBranchData) {
        console.log(`      ✅ Branches have converged. ${keys.length} variables available.`);
    } else {
        console.warn(`      ⚠️ Warning: Merge node reached but no branch data found.`);
    }

    // 2. Pass-Through
    // We don't need to return new data, just confirm we passed the gate.
    return { STATUS: "Merged", TIMESTAMP: Date.now() };
};