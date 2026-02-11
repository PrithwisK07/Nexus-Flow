import { Job } from 'bullmq';
import { readSheet, updateCell } from './engine/sheetWatcher.js';
import { resolveVariable, type ExecutionContext } from './engine/variableResolver.js';
import { NODE_REGISTRY } from './engine/nodes/index.js';

// --- RECURSIVE EXECUTOR ---
// Changed: Now returns Promise<ExecutionContext> so we can capture data
const executeChain = async (actions: any[], context: ExecutionContext, spreadsheetId?: string): Promise<ExecutionContext> => {
    
    for (const action of actions) {
        console.log(`   ➡️ Executing: ${action.type}`);

        // A. PARALLEL HANDLING (Fan-Out / Fan-In)
        if (action.type === 'parallel') {
            console.log(`   🔀 Forking into ${action.branches.length} Branches...`);
            const branches = action.branches || [];
            
            // 1. RUN BRANCHES & CAPTURE CONTEXT
            // We map the branches to promises that return their FINAL state
            const results = await Promise.allSettled(branches.map(async (branch: any[], index: number) => {
                // Clone context so branches don't fight during execution
                const branchContext = { ...context }; 
                
                // Execute the branch logic
                await executeChain(branch, branchContext, spreadsheetId);
                
                // CRITICAL: Return the modified context!
                return branchContext; 
            }));

            // 2. MERGE CONTEXTS (Fan-In)
            console.log(`   ⬇️ Merging Branch Data...`);
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    const branchFinalContext = result.value;
                    
                    // Merge strategy: Copy everything from branch back to main.
                    // Since node IDs are unique, this safely brings back {{node_1.TX_HASH}}
                    Object.assign(context, branchFinalContext);
                    
                } else {
                    console.error(`      🔴 Branch ${index + 1} Failed:`, result.reason);
                }
            });

            console.log(`   ✅ Parallel Sync Complete. Data Merged.`);
            continue; // Move to next action in main chain
        }

        // B. CONDITION HANDLING
        if (action.type === 'condition') {
             const valA = resolveVariable(action.inputs.variable, context);
             const valB = action.inputs.value;
             const op = action.inputs.operator;
             // Logic would go here
            return context; 
        }

        // C. STANDARD NODE
        const nodeExecutor = NODE_REGISTRY[action.type];
        if (!nodeExecutor) {
            console.error(`   ❌ Critical: Unknown Node ${action.type}`);
            break;
        }

        try {
            const inputs = { ...action.inputs, spreadsheetId };
            const result = await nodeExecutor(inputs, context);
            
            if (result) {
                // Global update
                Object.assign(context, result);
                
                // Namespaced update (This is what you are looking for!)
                if (action.id) {
                    context[action.id] = { ...result };
                }
            }
        } catch (err: any) {
            console.error(`   ❌ Error at ${action.type}: ${err.message}`);
            throw err;
        }
    }
    
    return context;
};

// --- WORKER ENTRY POINT ---
export default async function workerProcessor(job: Job) {
    console.log(`\n👷 [PID:${process.pid}] Processing Job ${job.id}`);
    
    const { config, context: initialContext } = job.data;
    let itemsToProcess: any[] = [];

    try {
        // --- MODE SETUP ---
        if (config.trigger.type === "sheets") {
            const sheetId = config.spreadsheetId;
            if (!sheetId) throw new Error("No Spreadsheet ID");
            const rawRows = await readSheet(sheetId);
            const triggerCol = config.trigger.colIndex !== undefined ? Number(config.trigger.colIndex) : 5;
            const triggerVal = config.trigger.value || "Pending";

            itemsToProcess = rawRows
                .map((row, index) => ({ row, realIndex: index + 2 }))
                .filter(item => item.row[triggerCol] === triggerVal);
                
            console.log(`   📊 [PID:${process.pid}] Sheet Mode: Processing ${itemsToProcess.length} rows.`);
        } else {
            itemsToProcess = [{ row: [], realIndex: -1, initialContext }];
            console.log(`   ⚡ [PID:${process.pid}] Single Mode: Executing 1 run.`);
        }

        // --- EXECUTION LOOP ---
        for (const item of itemsToProcess) {
            const context = { ...item.initialContext };
            
            if (item.row.length > 0) {
                item.row.forEach((val: any, idx: number) => {
                    const colLetter = String.fromCharCode(65 + idx);
                    context[`Column_${colLetter}`] = val;
                    if (config.columnMapping && config.columnMapping[idx.toString()]) {
                        context[config.columnMapping[idx.toString()]] = val;
                    }
                });
                context["ROW_INDEX"] = item.realIndex;
            }

            await executeChain(config.actions, context, config.spreadsheetId);
        }

        console.log(`🏁 [PID:${process.pid}] Job ${job.id} Completed.`);
        return { status: "success", processed: itemsToProcess.length };

    } catch (error: any) {
        console.error(`💥 [PID:${process.pid}] Job ${job.id} Failed:`, error.message);
        throw error;
    }
}