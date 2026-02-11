import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { workflowQueue } from "../queue/workflowQueue.js";

const app: express.Application = express();

app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

const PORT: number = 3001;

// --- API ROUTE: PRODUCER ONLY ---
app.post("/trigger-workflow", async (req, res) => {
    const workflowConfig = req.body.config;
    const manualContext = req.body.context || {}; 

    // 1. Basic Validation
    if (!workflowConfig) {
        return res.status(400).send({ error: "Missing workflow configuration." });
    }

    try {
        console.log(`\n📥 Received Job: [${workflowConfig.trigger.type.toUpperCase()}]`);

        // 2. Add to Redis Queue
        // We give the job a name 'execute-workflow' and pass the data payload
        const job = await workflowQueue.add('execute-workflow', {
            config: workflowConfig,
            context: manualContext,
            // Add a timestamp so we know when it was requested
            requestedAt: new Date().toISOString()
        });

        // 3. Respond Immediately (Non-Blocking)
        console.log(`   ✅ Queued Job ID: ${job.id}`);
        
        res.status(202).send({ 
            success: true, 
            message: "Workflow queued successfully", 
            jobId: job.id 
        });

    } catch (error: any) {
        console.error("❌ API Error:", error);
        res.status(500).send({ error: "Failed to queue workflow" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Nexus Producer API running on http://localhost:${PORT}`);
});