import express from "express";
import bodyParser from "body-parser";
import { createNexusAccount, sendTestTransaction } from "../engine/smartAccount.js";
import { readSheet } from "../engine/sheetWatcher.js";
import { validateBalance } from "../engine/guardRails.js";
import { type RuleGroup, evaluateRuleGroup } from "../engine/logic.js";
import { resolveVariable, type ExecutionContext } from "../engine/variableResolver.js";
import { NODE_REGISTRY } from "../engine/nodes/index.js";

const app: express.Application = express();
app.use(bodyParser.json());

const PORT: number = 3000;

app.post("/webhook/:userId", async (req, res) => {
    const userId = req.params.userId;
    console.log(`\n[Webhook] Triggered by User: ${userId}`);

    try {
        const nexusClient = await createNexusAccount(0);
        const accountAddress = nexusClient.account.address;
        
        const check = await validateBalance(
            accountAddress,
            req.body.amount,
            req.body.currency as 'ETH' | 'USDC'
        );

        if (!check.success) {
            console.error(`🛑 STOP: ${check.reason}`);
            return res.send({ error: check.reason });
        }

        console.log(`🤖 Smart Account Active: ${accountAddress}`);

        console.log(`🚀 Initiating Transfer to ${req.body.toAddress} ...`);
        
        const response = await sendTestTransaction(
            nexusClient,
            req.body.toAddress,
            req.body.amount,
            req.body.currency
        );

        if (!response.success) {
            return res.status(500).send({ error: "Transaction failed" });
        }

        res.status(200).send({ 
            status: "Success", 
            account: accountAddress, 
            txHash: response.hash 
        });
    } catch (error: any) {
        console.error("❌ Execution Failed:", error);
        res.status(500).send({ error: error.message || "Transaction failed" });
    }
})

app.post("/trigger-payroll", async (req, res) => {

    const workflowConfig = req.body.config;

    console.log("⚙️ Executing Workflow with Generic Engine...");

    try {
        const rawRows = await readSheet(workflowConfig.spreadsheetId);
        
        const triggerCol = workflowConfig.trigger.statusColumnIndex;
        const triggerVal = workflowConfig.trigger.statusValue;

        const pendingItems = rawRows
            .map((row, index) => ({ row, realIndex: index + 2 })) 
            .filter(item => item.row[triggerCol] === triggerVal);

        if (pendingItems.length === 0) {
            return res.send({ status: "No pending items found." });   
        }

        console.log(`Found ${pendingItems.length} items to process.`);

        for (const item of pendingItems) {
            const { row, realIndex } = item;

            const context: ExecutionContext = {};
            row.forEach((val, idx) => {
                const colLetter = String.fromCharCode(65 + idx); 
                context[`Column_${colLetter}`] = val;
            });
            
            context["ROW_INDEX"] = realIndex;

            console.log(`\n📄 Processing Row ${realIndex}...`);
            
            let workflowConfigFailed = false;
            for (const action of workflowConfig.actions) {
                
                if (workflowConfigFailed) break;

                if (action.rules) {
                    const resolvedRules = JSON.parse(JSON.stringify(action.rules));
                    
                    const resolveRecursive = (group: RuleGroup) => {
                        group.rules.forEach((rule: any) => {
                            if (rule.combinator) resolveRecursive(rule);
                            else {
                                rule.valueA = resolveVariable(rule.valueA, context);
                                rule.valueB = resolveVariable(rule.valueB, context);
                            }
                        });
                    };

                    resolveRecursive(resolvedRules);

                    const isAllowed = evaluateRuleGroup(resolvedRules);
                    if (!isAllowed) {
                        console.log(`   ⛔ Logic Blocked Action ${action.type}. Skipping.`);
                        workflowConfigFailed = true;
                        continue; 
                    }
                }

                const nodeExecutor = NODE_REGISTRY[action.type];

                if (!nodeExecutor) {
                    console.error(`   ❌ Unknown Node Type: ${action.type}`);
                    workflowConfigFailed = true;
                    continue;
                }

                try {
                    const inputs = { ...action.inputs, spreadsheetId: workflowConfig.spreadsheetId };

                    const result = await nodeExecutor(inputs, context);
                    
                    if (result) {
                        Object.assign(context, result);
                    }

                } catch (err: any) {
                    workflowConfigFailed = true;
                    console.error(`   ❌ Node ${action.type} Failed: ${err}`);
                }
            }
        }

        res.send({ status: "Batch Complete", processed: pendingItems.length });

    } catch (error: any) {
        console.error("❌ Workflow Error:", error);
        res.status(500).send({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Nexus Flow Engine running on http://localhost:${PORT}`);
})