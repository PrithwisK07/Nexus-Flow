import { resolveVariable } from "../variableResolver.js";
import { parseAbi, encodeFunctionData, type Abi } from "viem";
import { createNexusAccount } from "../smartAccount.js";
import { type ExecutionContext } from "../variableResolver.js";
import { Sanitize } from "../utils/inputSanitizer.js";

type ActionInput = Record<string, any>;

export const writeContract = async (inputs: ActionInput, context: ExecutionContext) => {
    const address = Sanitize.address(resolveVariable(inputs.contractAddress, context));
    
    let signature = resolveVariable(inputs.functionSignature, context);
    if (!signature.startsWith("function ")) signature = `function ${signature}`;

    // --- FIX STARTS HERE ---
    let rawArgs = inputs.args || [];
    let args: any[] = [];

    if (typeof rawArgs === "string") {
        if (rawArgs.trim() === "") {
            args = [];
        } else if (rawArgs.includes(",")) {
            args = rawArgs.split(",").map((s) => s.trim());
        } else {
            args = [rawArgs.trim()]; // CRITICAL FIX
        }
    } else if (Array.isArray(rawArgs)) {
        args = rawArgs;
    }

    args = Sanitize.array(args).map(arg => resolveVariable(arg, context));
    // --- FIX ENDS HERE ---

    console.log(`   ✍️ Executing Contract Writer: ${signature} on ${address}`);

    const abi = parseAbi([signature]);
    const funcName = signature.split("function ")[1].split("(")[0].trim();

    const data = encodeFunctionData({
        abi: abi as Abi,
        functionName: funcName,
        args: args
    });

    const nexusClient = await createNexusAccount(0);
        
    const txHash = await nexusClient.sendTransaction({
        to: address,
        value: 0n,
        data: data
    });

    console.log(`      -> Transaction Sent! Hash: ${txHash}`);
    return { "TX_HASH": txHash };
};