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
            // console.log(`   📡 Forwarding event: ${event.type} for Job ${event.jobId}`);
            io.to(event.jobId).emit('workflow_update', event);
        } catch (err) {
            console.error("❌ Failed to parse Redis message:", err);
        }
    }
});

// --- API ROUTE: PRODUCER ---
app.post("/trigger-workflow", async (req, res) => {
    const workflowConfig = req.body.config;
    const manualContext = req.body.context || {}; 

    if (!workflowConfig) {
        return res.status(400).send({ error: "Missing workflow configuration." });
    }

    try {
        console.log(`\n📥 Received Job: [${workflowConfig.trigger.type.toUpperCase()}]`);

        // Create a persistent ID based on workflow name or timestamp
        const safeName = (workflowConfig.workflowName || "default").replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const isTimer = workflowConfig.trigger && workflowConfig.trigger.type === 'timer';
        const workflowId = isTimer ? `cron_workflow_${safeName}` : `job_${Date.now()}`;

        // 🟢 THE HOT RELOAD FIX: Save the configuration to Redis instead of BullMQ!
        await redisConnection.set(`workflow_config:${workflowId}`, JSON.stringify(workflowConfig));

        // --- HANDLE SCHEDULED JOBS (TIMER) ---
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

        // --- STANDARD IMMEDIATE JOBS (Webhook, Manual Deploy, etc.) ---
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

// --- NEW API ROUTE: HOT RELOAD ---
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
            nextRun: new Date(job.next).toLocaleString()
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