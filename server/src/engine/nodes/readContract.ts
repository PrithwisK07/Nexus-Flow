import { createPublicClient, parseAbi, http } from "viem";
import { resolveVariable, type ExecutionContext } from "../variableResolver.js";
import { Sanitize } from "../utils/inputSanitizer.js";
import { sepolia } from "viem/chains";
import dotenv from "dotenv";

dotenv.config();
const RPC_URL = process.env.RPC_URL as string;

type ActionInput = Record<string, any>;

export const readContract = async (inputs: ActionInput, context: ExecutionContext) => {
    const address = Sanitize.address(resolveVariable(inputs.contractAddress, context));
    // Ensure signature starts with "function "
    let signature = resolveVariable(inputs.functionSignature, context);
    if (!signature.startsWith("function ")) signature = `function ${signature}`;
    
    // --- FIX STARTS HERE ---
    let rawArgs = inputs.args || [];
    let args: any[] = [];

    // Normalize input to an array
    if (typeof rawArgs === "string") {
        if (rawArgs.trim() === "") {
            args = [];
        } else if (rawArgs.includes(",")) {
            args = rawArgs.split(",").map((s) => s.trim());
        } else {
            // CRITICAL: Wrap single string argument in an array
            args = [rawArgs.trim()];
        }
    } else if (Array.isArray(rawArgs)) {
        args = rawArgs;
    }

    // Resolve variables for every argument in the array
    args = args.map((arg: any) => resolveVariable(arg, context));
    // --- FIX ENDS HERE ---

    console.log(`   📖 Executing Contract Reader: ${signature} on ${address}`);
    console.log(`      Args:`, args);

    const publicClient = createPublicClient({
        transport: http(RPC_URL),
        chain: sepolia
    })
    
    // Try/Catch specifically for parsing ABI errors to give better feedback
    try {
        const parsedAbi = parseAbi([signature]);
        const funcName = signature.split("function ")[1].split("(")[0].trim();

        const contract = await publicClient.readContract({
            address: address as `0x${string}`,
            abi: parsedAbi,
            functionName: funcName,
            args: args
        });

        console.log(`      -> Result: ${contract}`);

        // Convert BigInt to string for easier JSON handling downstream
        const resultValue = typeof contract === 'bigint' ? contract.toString() : contract;

        return {
            "CONTRACT_RESULT": resultValue
        };
    } catch (e: any) {
        throw new Error(`Read Failed: ${e.shortMessage || e.message}`);
    }
};