import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import http from "http"; 
import { Server } from "socket.io"; 
import { workflowQueue } from "../queue/workflowQueue.js";
import { redisConnection } from "../config/redis.js"; 
import { NODE_REGISTRY } from "../engine/nodes/index.js";

const app: express.Application = express();

app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

const PORT: number = 3001;

// --- 1. SETUP HTTP & SOCKET SERVER ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow Frontend to connect
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// --- 2. SETUP REDIS SUBSCRIBER ---
// We need a dedicated connection for subscribing (cannot reuse the queue connection directly for sub)
const redisSubscriber = redisConnection.duplicate();

redisSubscriber.on('error', (err) => console.error('❌ Redis Subscriber Error:', err));
redisSubscriber.on('connect', () => console.log('✅ Redis Subscriber Connected'));

// Subscribe to the channel where Workers publish events
redisSubscriber.subscribe('workflow_events');

// --- 3. SOCKET LOGIC ---
io.on('connection', (socket) => {
    console.log(`🔌 Client Connected: ${socket.id}`);

    // Client joins a "room" for a specific Job ID
    socket.on('subscribe_job', (jobId) => {
        if (jobId) {
            socket.join(jobId);
            console.log(`   👀 Client ${socket.id} watching Job: ${jobId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client Disconnected: ${socket.id}`);
    });
});

// --- 4. BRIDGE: REDIS -> SOCKET ---
// When a Worker publishes an event, we forward it to the specific Frontend client
redisSubscriber.on('message', (channel, message) => {
    if (channel === 'workflow_events') {
        try {
            const event = JSON.parse(message);
            // Broadcast ONLY to clients watching this Job ID
            io.to(event.jobId).emit('workflow_update', event);
        } catch (err) {
            console.error("❌ Failed to parse Redis message:", err);
        }
    }
});

// --- API ROUTE: PRODUCER (DEPLOY & TEST) ---
app.post("/trigger-workflow", async (req, res) => {
    // 🟢 EXTRACT isTestRun FLAG
    const { config: workflowConfig, context: manualContext = {}, isTestRun } = req.body; 

    if (!workflowConfig) {
        return res.status(400).send({ error: "Missing workflow configuration." });
    }

    try {
        console.log(`\n📥 Received Job: [${workflowConfig.trigger?.type?.toUpperCase() || 'UNKNOWN'}]`);

        // Create a persistent ID based on workflow name or timestamp
        const safeName = (workflowConfig.workflowName || "default").replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        
        const triggerType = workflowConfig.trigger?.type;
        const isTimer = triggerType === 'timer';
        const isWebhook = triggerType === 'webhook';
        
        let workflowId = `job_${Date.now()}`;
        if (isTimer) {
            workflowId = `cron_workflow_${safeName}`;
        } else if (isWebhook) {
            workflowId = `workflow_${safeName}`;
        }

        // 🟢 THE HOT RELOAD FIX: Save the configuration to Redis instead of BullMQ!
        await redisConnection.set(`workflow_config:${workflowId}`, JSON.stringify(workflowConfig));

        // --- 🚀 HANDLE "RUN NOW" MANUAL OVERRIDE ---
        if (isTestRun) {
            const immediateId = `test_run_${Date.now()}`;
            
            // Inject a mock payload so Webhook variables don't crash the test
            const testContext = {
                ...manualContext,
                WebhookBody: { 
                    test: true, 
                    amount: 100, 
                    email: "test@example.com", 
                    message: "Manual Test Run",
                    // Add dummy data for other common webhook structures just in case
                    data: { id: "test_123", status: "succeeded" }
                }
            };

            await workflowQueue.add(
                'execute-workflow', 
                { 
                    context: testContext, 
                    requestedAt: new Date().toISOString(),
                    workflowId: workflowId, // Must pass the base ID so worker fetches correct config
                    executionId: immediateId // Explicit room ID for Socket broadcasting
                }, 
                { jobId: immediateId } // Unique Job ID for this execution
            );
            
            console.log(`🚀 Manual Test Run Queued: ${immediateId}`);
            return res.status(202).send({ 
                success: true, 
                message: "Test run started!", 
                jobId: immediateId 
            });
        }

        // --- 1. HANDLE WEBHOOK DEPLOYMENTS ---
        if (isWebhook) {
            const webhookUrl = `http://localhost:${PORT}/webhook/${workflowId}`;
            console.log(`🔗 Webhook Deployed! Listening at: ${webhookUrl}`);
            
            return res.status(202).send({ 
                success: true, 
                message: "Webhook Active!", 
                webhookUrl: webhookUrl, 
                jobId: workflowId 
            });
        }

        // --- 2. HANDLE SCHEDULED JOBS (TIMER) ---
        if (isTimer) {
            const { scheduleType, intervalMinutes, cronExpression } = workflowConfig.trigger;
            let repeatOpts: any = {};

            if (scheduleType === 'cron' && cronExpression) {
                // E.g., '0 12 * * *' (Run every day at noon)
                repeatOpts = { pattern: cronExpression };
            } else if (scheduleType === 'interval' && intervalMinutes) {
                // BullMQ expects milliseconds
                const ms = parseInt(intervalMinutes) * 60 * 1000;
                repeatOpts = { every: ms };
            } else {
                return res.status(400).send({ error: "Invalid timer configuration." });
            }

            // --- ♻️ OVERWRITE EXISTING SCHEDULE ---
            // Fetch all active schedules from Redis
            const repeatableJobs = await workflowQueue.getRepeatableJobs();
            
            // Look for an existing schedule matching this workflow's ID
            const existingJob = repeatableJobs.find(job => job.id === workflowId);
            
            if (existingJob) {
                // Remove the old schedule tick
                await workflowQueue.removeRepeatableByKey(existingJob.key);
                console.log(`♻️  Updated existing schedule for: ${workflowConfig.workflowName || 'default'}. Changes applied!`);
            } else {
                console.log(`⏰ Scheduling new workflow: ${workflowId} with opts:`, repeatOpts);
            }

            await workflowQueue.add(
                'execute-workflow', 
                {
                    // Notice we NO LONGER send config here! Just the ID and context.
                    context: manualContext,
                    requestedAt: new Date().toISOString(),
                    workflowId: workflowId 
                }, 
                { 
                    repeat: repeatOpts,
                    jobId: workflowId // Keeps the job ID consistent across repeats
                }
            );

            return res.status(202).send({ 
                success: true, 
                message: "Workflow scheduled successfully!",
                jobId: workflowId 
            });
        }

        // --- 3. STANDARD IMMEDIATE JOBS (Manual Deploy, etc.) ---
        const job = await workflowQueue.add(
            'execute-workflow', 
            {
                // Notice we NO LONGER send config here! Just the ID and context.
                context: manualContext,
                requestedAt: new Date().toISOString(),
                workflowId: workflowId 
            },
            {
                jobId: workflowId // Force the base Job ID to match
            }
        );

        console.log(`   ✅ Queued Immediate Job ID: ${job.id}`);
        
        res.status(202).send({ 
            success: true, 
            message: "Workflow queued successfully", 
            jobId: job.id // Frontend needs this ID to subscribe!
        });

    } catch (error: any) {
        console.error("❌ API Error:", error);
        res.status(500).send({ error: "Failed to queue workflow" });
    }
});

// --- THE WEBHOOK RECEIVER ---
app.post('/webhook/:workflowId', async (req, res) => {
    const { workflowId } = req.params;

    try {
        // 1. Check if this workflow exists and is deployed
        const configString = await redisConnection.get(`workflow_config:${workflowId}`);
        if (!configString) {
            return res.status(404).json({ error: "Webhook not found. Has this workflow been deployed?" });
        }

        // 2. Capture the incoming data from the external app
        // We nest it inside "WebhookBody" so users can access it cleanly
        const externalContext = {
            WebhookBody: req.body,       // The JSON payload (e.g., Stripe payment data)
            WebhookQuery: req.query,     // Any URL parameters
            WebhookHeaders: req.headers  // Useful for signature verification later
        };

        // 3. Queue the job in BullMQ
        const executionId = `webhook_exec_${Date.now()}`;
        
        await workflowQueue.add(
            'execute-workflow', 
            { 
                workflowId: workflowId, 
                executionId: workflowId, // 🟢 FIX: Broadcast visuals to the base workflow room so frontend sees it
                context: externalContext,
                requestedAt: new Date().toISOString()
            }, 
            { jobId: executionId } // Job ID must stay unique so BullMQ doesn't deduplicate it
        );

        console.log(`📥 Webhook received for [${workflowId}]. Queued execution: ${executionId}`);
        
        // Return a 200 OK immediately so the external service doesn't timeout waiting for the blockchain
        res.status(200).json({ success: true, message: "Webhook accepted and queued." });

    } catch (error: any) {
        console.error("Webhook processing error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// --- API ROUTE: HOT RELOAD ---
app.put('/hot-reload', async (req, res) => {
    const { workflowId, config } = req.body;
    try {
        if (!workflowId || !config) {
            return res.status(400).json({ success: false, error: "Missing workflowId or config" });
        }
        
        // Silently overwrite the active configuration in Redis
        await redisConnection.set(`workflow_config:${workflowId}`, JSON.stringify(config));
        
        res.json({ success: true });
    } catch (error: any) {
        console.error("❌ Hot Reload Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- API ROUTE: TEST INDIVIDUAL NODE ---
app.post('/test-node', async (req, res) => {
    try {
        const { type, config } = req.body;
        
        const nodeExecutor = NODE_REGISTRY[type];
        if (!nodeExecutor) {
            return res.status(400).json({ success: false, error: `Unknown node type: ${type}` });
        }

        const mockContext = { 
            TEST_MODE: true,
        };

        const result = await nodeExecutor(config, mockContext);
        
        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error(`Test Node Error (${req.body.type}):`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- GET ACTIVE SCHEDULES ---
app.get('/schedules', async (req, res) => {
    try {
        // BullMQ built-in method to get all repeatable jobs
        const jobs = await workflowQueue.getRepeatableJobs();
        
        // Format the output for the frontend
        const formattedJobs = jobs.map(job => ({
            key: job.key,
            name: job.name,
            id: job.id, // This is the workflowId we passed earlier
            pattern: job.pattern || `Every ${job.every / 60000} mins`,
            nextRun: new Date(job.next).toLocaleString(),
            nextRunTimestamp: job.next // <-- Added this line to pass the raw timestamp to the frontend
        }));

        res.json({ success: true, jobs: formattedJobs });
    } catch (error: any) {
        console.error("Error fetching schedules:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- DELETE/STOP A SCHEDULE ---
app.delete('/schedules/:key', async (req, res) => {
    try {
        const { key } = req.params;
        
        // BullMQ requires the exact 'key' (a combination of id, cron string, etc.) to remove it
        // We decode it because it's passed as a URL parameter
        const decodedKey = decodeURIComponent(key);
        
        await workflowQueue.removeRepeatableByKey(decodedKey);
        
        console.log(`🛑 Stopped schedule: ${decodedKey}`);
        res.json({ success: true, message: "Schedule stopped successfully." });
    } catch (error: any) {
        console.error("Error stopping schedule:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- START SERVER ---
// Note: We listen on 'server' (HTTP+Socket), not just 'app' (Express)
server.listen(PORT, () => {
    console.log(`🚀 Nexus Producer API + Socket Server running on http://localhost:${PORT}`);
});