import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import http from "http"; // Required for Socket.io
import { Server } from "socket.io"; // Socket.io Server
import { workflowQueue } from "../queue/workflowQueue.js";
import { redisConnection } from "../config/redis.js"; // Reuse existing connection config

const app: express.Application = express();

app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

const PORT: number = 3001;

// --- 1. SETUP HTTP & SOCKET SERVER ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow Frontend to connect
        methods: ["GET", "POST"]
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

        // Add to Redis Queue
        const job = await workflowQueue.add('execute-workflow', {
            config: workflowConfig,
            context: manualContext,
            requestedAt: new Date().toISOString()
        });

        console.log(`   ✅ Queued Job ID: ${job.id}`);
        
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

// --- START SERVER ---
// Note: We listen on 'server' (HTTP+Socket), not just 'app' (Express)
server.listen(PORT, () => {
    console.log(`🚀 Nexus Producer API + Socket Server running on http://localhost:${PORT}`);
});