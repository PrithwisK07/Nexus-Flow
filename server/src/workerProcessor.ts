import { Job } from 'bullmq';
import { readSheet, updateCell } from './engine/sheetWatcher.js';
import { resolveVariable, type ExecutionContext } from './engine/variableResolver.js';
import { NODE_REGISTRY } from './engine/nodes/index.js';
import { evaluateRuleGroup, type RuleGroup, type LogicRule } from './engine/logic.js';
import { redisPublisher } from './config/redisPublisher.js';
import { redisConnection } from './config/redis.js'; // <--- NEW: Import Redis connection for Hot Reloading

// --- HELPER: REAL-TIME REPORTER ---
// Sends status updates to Redis -> API -> Frontend (Socket)
const emitEvent = async (jobId: string, type: string, data: any) => {
    try {
        const payload = JSON.stringify({ jobId, type, ...data });
        await redisPublisher.publish('workflow_events', payload);
    } catch (err) {
        console.error("Redis Publish Error:", err);
    }
};

// --- HELPER: RECURSIVE VARIABLE RESOLVER ---
const resolveRuleGroup = (group: RuleGroup, context: ExecutionContext): RuleGroup => {
    return {
        combinator: group.combinator,
        rules: group.rules.map((rule: any) => {
            if ('combinator' in rule) {
                return resolveRuleGroup(rule as RuleGroup, context);
            }
            const r = rule as LogicRule;
            return {
                operator: r.operator,
                valueA: resolveVariable(r.valueA, context),
                valueB: resolveVariable(r.valueB, context)
            };
        })
    };
};

// --- RECURSIVE EXECUTOR ---
const executeChain = async (
    actions: any[], 
    context: ExecutionContext, 
    spreadsheetId?: string, 
    jobId?: string // <--- NEW: Pass Job ID for reporting
): Promise<ExecutionContext> => {
    
    for (const action of actions) {
        console.log(`   ➡️ Executing: ${action.type} [${action.id}]`);

        // 1. NOTIFY: Node Started
        if (jobId) await emitEvent(jobId, 'node_started', { nodeId: action.id, nodeType: action.type });

        // A. PARALLEL HANDLING (Fan-Out / Fan-In)
        if (action.type === 'parallel') {
            console.log(`   🔀 Forking into ${action.branches.length} Branches...`);
            const branches = action.branches || [];
            
            // Execute branches and capture their modified contexts
            const results = await Promise.allSettled(branches.map(async (branch: any[]) => {
                const branchContext = { ...context }; 
                // Pass jobId recursively!
                await executeChain(branch, branchContext, spreadsheetId, jobId);
                return branchContext; 
            }));

            console.log(`   ⬇️ Merging Branch Data...`);
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    // Merge branch variables back to main
                    Object.assign(context, result.value);
                } else {
                    console.error(`      🔴 Branch ${index + 1} Failed:`, result.reason);
                }
            });
            console.log(`   ✅ Parallel Sync Complete.`);
            
            // Mark parallel block as complete (visuals)
            if (jobId) await emitEvent(jobId, 'node_completed', { nodeId: action.id, result: { status: 'merged' } });
            
            continue; 
        }

        // B. CONDITION HANDLING
        if (action.type === 'condition') {
             console.log(`   ⚖️ Evaluating Logic Rules...`);

             let rules = action.inputs.rules;
             // Legacy fallback
             if (!rules && action.inputs.variable) {
                 rules = {
                    combinator: 'AND',
                    rules: [{
                        valueA: action.inputs.variable,
                        operator: action.inputs.operator,
                        valueB: action.inputs.value
                    }]
                 };
             }

             if (!rules) {
                 console.warn(`      ⚠️ No rules found. Skipping.`);
                 continue;
             }

             const resolvedRules = resolveRuleGroup(rules, context);
             const isTrue = evaluateRuleGroup(resolvedRules);
             console.log(`      -> Result: ${isTrue ? "✅ TRUE" : "❌ FALSE"}`);

             // Notify result (useful for debugging UI)
             if (jobId) await emitEvent(jobId, 'node_completed', { nodeId: action.id, result: { condition: isTrue } });

             if (isTrue) {
                 if (action.trueRoutes && action.trueRoutes.length > 0) {
                     console.log(`      -> Following TRUE Path...`);
                     return await executeChain(action.trueRoutes, context, spreadsheetId, jobId);
                 }
             } else {
                 if (action.falseRoutes && action.falseRoutes.length > 0) {
                     console.log(`      -> Following FALSE Path...`);
                     return await executeChain(action.falseRoutes, context, spreadsheetId, jobId);
                 }
             }

             return context; 
        }

        // C. STANDARD NODE EXECUTION
        const nodeExecutor = NODE_REGISTRY[action.type];
        if (!nodeExecutor) {
            const errorMsg = `Unknown Node Type: ${action.type}`;
            console.error(`   ❌ Critical: ${errorMsg}`);
            if (jobId) await emitEvent(jobId, 'node_failed', { nodeId: action.id, error: errorMsg });
            break;
        }

        try {
            const inputs = { ...action.inputs, spreadsheetId };
            const result = await nodeExecutor(inputs, context);
            
            if (result) {
                Object.assign(context, result);
                if (action.id) {
                    context[action.id] = { ...result };
                }
            }

            // 2. NOTIFY: Node Success
            if (jobId) await emitEvent(jobId, 'node_completed', { nodeId: action.id, result });

        } catch (err: any) {
            console.error(`   ❌ Error at ${action.type}: ${err.message}`);
            // 3. NOTIFY: Node Failed
            if (jobId) await emitEvent(jobId, 'node_failed', { nodeId: action.id, error: err.message });
            throw err; // Stop this chain
        }
    }
    
    return context;
};

// --- WORKER ENTRY POINT ---
export default async function workerProcessor(job: Job) {
    console.log(`\n👷 [PID:${process.pid}] Processing Job ${job.id}`);
    
    // FIX: Extract workflowId to ensure we match the frontend subscription room exactly
    const { context: initialContext, workflowId } = job.data;
    const eventRoomId = workflowId || job.id; 

    let itemsToProcess: any[] = [];

    try {
        // 🟢 HOT RELOAD FIX: Fetch the absolute latest configuration from Redis!
        const configString = await redisConnection.get(`workflow_config:${workflowId}`);
        let config;
        
        if (configString) {
            config = JSON.parse(configString);
        } else if (job.data.config) {
            // Safety fallback for immediate runs or legacy jobs
            console.warn(`   ⚠️ Config for ${workflowId} not found in Redis. Falling back to static payload.`);
            config = job.data.config;
        } else {
            throw new Error(`Configuration for ${workflowId} not found in Redis. It may have been deleted.`);
        }

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
        } else if (config.trigger.type === "timer") {
            // TIMER MODE (CRON/INTERVAL)
            itemsToProcess = [{ row: [], realIndex: -1, initialContext }];
            const triggerTime = new Date(job.timestamp).toLocaleString();
            console.log(`   ⏰ [PID:${process.pid}] Timer Mode: Executing scheduled run for ${triggerTime}.`);
        } else {
            // WEBHOOK / MANUAL MODE
            itemsToProcess = [{ row: [], realIndex: -1, initialContext }];
            console.log(`   ⚡ [PID:${process.pid}] Single Mode: Executing 1 run.`);
        }

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

            // FIX: Emit reset signal so frontend canvas clears previous run states
            await emitEvent(eventRoomId, 'workflow_run_started', { timestamp: Date.now() });

            // Start the chain execution, passing the exact eventRoomId for reporting
            await executeChain(config.actions, context, config.spreadsheetId, eventRoomId);
        }

        console.log(`🏁 [PID:${process.pid}] Job ${eventRoomId} Completed.`);
        return { status: "success", processed: itemsToProcess.length };

    } catch (error: any) {
        console.error(`💥 [PID:${process.pid}] Job ${eventRoomId} Failed:`, error.message);
        throw error;
    }
}