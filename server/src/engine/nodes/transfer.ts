import { resolveVariable, type ExecutionContext } from "../variableResolver.js";
import { createNexusAccount, sendTestTransaction } from "../smartAccount.js";
import { validateBalance } from "../guardRails.js";
import { Sanitize } from "../utils/inputSanitizer.js";

type ActionInput = Record<string, any>;

export const transfer = async (inputs: ActionInput, context: ExecutionContext) => {
    const to = Sanitize.address(resolveVariable(inputs.toAddress, context));
    const rawAmt = resolveVariable(inputs.amount, context);
    const amt = Sanitize.number(rawAmt);
    const curr = resolveVariable(inputs.currency, context);
    const name = resolveVariable(inputs.name, context);

    let decimals = 18;
    if (Sanitize.equals(curr, "USDC") || Sanitize.equals(curr, "USDT")) decimals = 6;
    if (Sanitize.equals(curr, "WBTC")) decimals = 8;
    if (inputs.decimals) decimals = Number(inputs.decimals);

    console.log(`   ➡️ Transfer: Sending ${amt} ${curr} to ${name} (${to})`);

    if (!to || !to.startsWith("0x")) {
        console.error(`   ❌ Invalid Address. Skipping.`);
        throw new Error(`Invalid Address: ${to}`);
    }

    try {
        const nexusClient = await createNexusAccount(0);
        const accountAddress = nexusClient.account.address;
        
        const check = await validateBalance(accountAddress, amt.toString(), curr);
        if (!check.success) {
            console.error(`   🛑 STOP: ${check.reason}`);
            throw new Error(`Guard Rail Triggered: ${check.reason}`);
        }

        const response = await sendTestTransaction(nexusClient, to, amt.toString(), curr);
        
        if (typeof response === 'object' && response.success === false) {
             throw new Error(`Transaction Execution Failed`);
        }

        const txHash = response.hash;
        
        // --- NEW: Generate Explorer Link ---
        const explorerLink = `https://sepolia.etherscan.io/tx/${txHash}`;
        console.log(`      🔗 View on Etherscan: ${explorerLink}`);

        context["TX_HASH"] = txHash; 
        console.log(`   ✅ Transaction complete: ${txHash}`);

        return { 
            "TX_HASH": txHash, 
            "EXPLORER_LINK": explorerLink,
            "STATUS": "Success" 
        };

    } catch (err: any) {
        console.error(`   ❌ Transfer Failed: ${err.message}`);
        return { "STATUS": "Failed", "ERROR": err.message };
    }
}