import { Job } from 'bullmq';
import { readSheet, updateCell } from './engine/sheetWatcher.js';
import { resolveVariable, type ExecutionContext } from './engine/variableResolver.js';
import { NODE_REGISTRY } from './engine/nodes/index.js';
import { evaluateRuleGroup, type RuleGroup, type LogicRule } from './engine/logic.js';
import { redisPublisher } from './config/redisPublisher.js';
import { redisConnection } from './config/redis.js'; 
import { dispatchVoiceAlert } from './engine/utils/twilioService.js';

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
export const executeChain = async (
    actions: any[], 
    context: ExecutionContext, 
    spreadsheetId?: string, 
    jobId?: string 
): Promise<ExecutionContext> => {
    
    for (let index = 0; index < actions.length; index++) {
        const action = actions[index];
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

        // B. CONDITION HANDLING (If/Else)
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

        // C. SWITCH ROUTER HANDLING (Multi-Path)
        if (action.type === 'switch_router') {
             console.log(`   🔀 Evaluating Switch Routes...`);
             
             // Run the switch logic to determine the route
             const nodeExecutor = NODE_REGISTRY['switch_router'];
             if (!nodeExecutor) throw new Error("switch_router missing from NODE_REGISTRY");
             
             const result = await nodeExecutor(action.inputs, context);
             const routeToFollow = result.MATCHED_ROUTE; // e.g. "BUY" or "default"

             // Notify UI of the decision
             if (jobId) await emitEvent(jobId, 'node_completed', { nodeId: action.id, result });

             // Look up the nested chain for this specific route
             const nextChain = action.routeMap ? action.routeMap[routeToFollow] : null;

             if (nextChain && nextChain.length > 0) {
                 console.log(`      -> Following path: [${routeToFollow}]`);
                 return await executeChain(nextChain, context, spreadsheetId, jobId);
             } else {
                 console.log(`      -> Dead end at [${routeToFollow}]. Continuing main sequence if any.`);
                 // Return context to allow the outer chain to continue if this was a sub-branch
                 return context; 
             }
        }

        // D. STANDARD NODE EXECUTION
        let nodeExecutor = NODE_REGISTRY[action.type];
        
        try {
            // We moved this inside the try/catch so missing nodes trigger a phone call too!
            if (!nodeExecutor) {
                throw new Error(`Unknown Node Type: ${action.type}`);
            }

            // 🟢 FIX 1: Inject _nodeId so the iterator knows its own identity
            const inputs = { ...action.inputs, spreadsheetId, _nodeId: action.id };
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
            const errorMessage = err?.message || String(err);
            console.error(`   ❌ Error at ${action.type}: ${errorMessage}`);

            // Special handling for actionable insufficient balance errors
            const isActionRequired = typeof errorMessage === 'string' && errorMessage.startsWith('[ACTION_REQUIRED]');
            const isDepositRequired = isActionRequired && errorMessage.includes('"DEPOSIT_REQUIRED"');

            // --- 🟢 PAUSE STATE HANDLING (For Deposits) ---
            if (isDepositRequired && jobId) {
                try {
                    const workflowId = context.SYSTEM_WORKFLOW_ID as string | undefined;
                    if (workflowId) {
                        const pauseKey = `workflow_pause:${workflowId}:${jobId}`;
                        const remainingActions = actions.slice(index); // Resume from this node onward

                        const pauseState = {
                            workflowId,
                            jobId,
                            nodeId: action.id,
                            reason: 'PAUSED_INSUFFICIENT_BALANCE',
                            context,
                            remainingActions,
                            spreadsheetId: spreadsheetId || null,
                        };

                        await redisConnection.set(pauseKey, JSON.stringify(pauseState));

                        // Mark workflow as paused for the frontend
                        await emitEvent(jobId, 'workflow_paused', {
                            nodeId: action.id,
                            reason: 'PAUSED_INSUFFICIENT_BALANCE',
                        });
                    }
                } catch (pauseErr) {
                    console.error('   ❌ Failed to persist pause state:', pauseErr);
                }
            }

            // --- 🟢 TWILIO AUTOMATED VOICE ALERT (For ALL Errors) ---
            const currentWorkflowId = context.SYSTEM_WORKFLOW_ID as string | undefined;
            if (currentWorkflowId) {
                let spokenAlert = "";

                if (isDepositRequired) {
                    try {
                        const payloadStr = errorMessage.split('[ACTION_REQUIRED]')[1]!.trim();
                        const parsedAction = JSON.parse(payloadStr);
                        spokenAlert = `Insufficient funds detected. You need to deposit ${parsedAction.missingAmountFormatted} ${parsedAction.tokenSymbol}.`;
                    } catch (e) {
                        spokenAlert = "Insufficient funds detected on a Web 3 node.";
                    }
                } else {
                    // Clean up the error message for Twilio's Text-to-Speech
                    // We remove JSON brackets, special symbols, and cap it at 120 characters
                    const cleanError = errorMessage.replace(/[^a-zA-Z0-9 .,!?]/g, ' ').substring(0, 120);
                    const cleanNodeType = action.type ? action.type.replace('_', ' ') : 'unknown';
                    spokenAlert = `A critical error occurred at the ${cleanNodeType} node. The system reported: ${cleanError}.`;
                }

                // Fire async so it doesn't block the worker teardown sequence
                dispatchVoiceAlert(currentWorkflowId, spokenAlert).catch(e => console.error("Twilio Dispatch Error:", e));
            
                if (jobId) {
                    await emitEvent(jobId, 'twilio_call_dispatched', { 
                        message: "Automated phone call dispatched to owner." 
                    });
                }
            }

            // --- 3. NOTIFY: Node Failed (includes actionable errors for the UI) ---
            if (jobId) {
                await emitEvent(jobId, 'node_failed', { 
                    nodeId: action.id, 
                    error: errorMessage,
                });
            }

            throw err; // Stop this chain
        }
    }
    
    return context;
};

// --- WORKER ENTRY POINT ---
export default async function workerProcessor(job: Job) {
    console.log(`\n👷 [PID:${process.pid}] Processing Job ${job.id}`);
    
    // FIX: Extract executionId alongside workflowId to correctly route test run events
    const { context: initialContext, workflowId, executionId } = job.data;
    
    // The Socket Room is the executionId (for manual tests) OR the workflowId (for scheduled runs)
    const eventRoomId = executionId || workflowId || job.id; 

    let itemsToProcess: any[] = [];

    try {
        // Fetch the absolute latest configuration from Redis using the BASE workflowId
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

        // If this is a resume job, override actions (and optional spreadsheetId) from pause state
        if (job.data.resume && Array.isArray(job.data.remainingActions)) {
            console.log(`   🔁 Resume Mode: Continuing paused workflow ${workflowId}...`);
            config.actions = job.data.remainingActions;
            if (job.data.spreadsheetIdOverride) {
                config.spreadsheetId = job.data.spreadsheetIdOverride;
            }
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
            
            const context: any = { 
                ...item.initialContext,
                SYSTEM_WORKFLOW_ID: workflowId,
                SYSTEM_JOB_ID: eventRoomId,
                _engine: executeChain 
            };
            
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

            // To prevent race conditions, wait a bit before starting the chain
            await new Promise(resolve => setTimeout(resolve, 300));

            // Emit reset signal so frontend canvas clears previous run states in the correct room
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