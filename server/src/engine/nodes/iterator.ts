import { resolveVariable, type ExecutionContext } from "../variableResolver.js";
import { redisConnection } from "../../config/redis.js"; 

type ActionInput = Record<string, any>;

export const iteratorNode = async (
    inputs: ActionInput, 
    context: ExecutionContext, 
    spreadsheetId?: string, 
    jobId?: string
) => {
    const rawArray = resolveVariable(inputs.arrayData, context);
    const workflowId = inputs.workflowId;
    const nodeId = inputs._nodeId || `iterator_${workflowId}`; 

    if (!workflowId) throw new Error("No Sub-Workflow selected.");

    let items: any[] = [];
    if (Array.isArray(rawArray)) {
        items = rawArray;
    } else if (typeof rawArray === 'string') {
        try { items = JSON.parse(rawArray); } 
        catch(e) { items = [rawArray]; }
    } else {
        items = [rawArray];
    }

    if (items.length === 0) {
        console.log(`   🔁 Iterator: Array is empty. Skipping loop.`);
        return { STATUS: "Skipped", PROCESSED_ITEMS: 0 };
    }

    const rawWf = await redisConnection.hget('nexus_workflows', workflowId);
    if (!rawWf) throw new Error(`Sub-workflow with ID ${workflowId} not found.`);
    
    const subWorkflow = JSON.parse(rawWf);

    if (!subWorkflow.actions || subWorkflow.actions.length === 0) {
        throw new Error(`Workflow [${subWorkflow.name}] has no compiled actions. Please open it in the canvas and click Save again!`);
    }

    // 🟢 FIX 1: BULLETPROOF REDIS STATE
    // We use the parent workflow ID + the iterator node ID to create a unique, persistent save state
    const stateKey = `iterator_state:${context.SYSTEM_WORKFLOW_ID}:${nodeId}`;
    let startIndex = 0;
    
    const savedState = await redisConnection.get(stateKey);
    if (savedState) {
        startIndex = parseInt(savedState, 10);
        console.log(`   🔁 Iterator: Resuming [${subWorkflow.name}] from loop index ${startIndex + 1}...`);
    } else {
        console.log(`   🔁 Iterator: Looping ${items.length} times for workflow [${subWorkflow.name}]`);
    }

    // 🟢 FIX 2: GET ENGINE FROM CONTEXT (NO CIRCULAR IMPORTS!)
    const executeChain = context._engine;
    if (!executeChain) throw new Error("Execution engine not found in context.");

    const errors: string[] = [];

    for (let i = startIndex; i < items.length; i++) {
        console.log(`      -> 🔄 Executing Loop ${i + 1} of ${items.length}...`);
        
        // Save current progress to Redis before executing the child workflow
        await redisConnection.set(stateKey, i.toString());
        
        // Deep copy the context for isolation
        const subContext = JSON.parse(JSON.stringify(context));
        
        // Re-inject the engine (because JSON.stringify strips functions out!)
        subContext._engine = executeChain;
        
        subContext["Iterator"] = {
            item: items[i],
            index: i,
            total: items.length
        };

        try {
            await executeChain(subWorkflow.actions, subContext, spreadsheetId, undefined);
        } catch (error: any) {
            console.error(`      -> ❌ Loop ${i + 1} Failed:`, error);
            
            // If it's a deposit requirement, immediately bubble it up to pause the workflow
            if (error.message && error.message.includes('[ACTION_REQUIRED]')) {
                 throw new Error(error.message); 
            }

            // Normal logic errors are just logged so the loop can continue
            errors.push(`Item '${items[i]}': ${error.message}`);
        }
    }

    // 🟢 CLEANUP: Loop finished successfully, clear the save state for future runs!
    await redisConnection.del(stateKey);

    if (errors.length > 0) {
        return {
            "STATUS": "Completed with Errors",
            "PROCESSED_ITEMS": items.length - startIndex,
            "ERRORS": errors
        };
    }

    return {
        "STATUS": "Success",
        "PROCESSED_ITEMS": items.length - startIndex
    };
};