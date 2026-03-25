import { createPublicClient, parseAbi, http } from "viem";
import { resolveVariable, type ExecutionContext } from "../variableResolver.js";
import { Sanitize } from "../utils/inputSanitizer.js";
import { baseSepolia } from "viem/chains";
import dotenv from "dotenv";

dotenv.config();
const RPC_URL = process.env.RPC_URL as string;

type ActionInput = Record<string, any>;

export const readContract = async (inputs: ActionInput, context: ExecutionContext) => {
    const address = Sanitize.address(resolveVariable(inputs.contractAddress, context));
    
    let signature = resolveVariable(inputs.functionSignature, context);
    if (!signature.startsWith("function ")) signature = `function ${signature}`;
    
    let rawArgs = inputs.args || [];
    let args: any[] = [];

    if (typeof rawArgs === "string") {
        if (rawArgs.trim() === "") {
            args = [];
        } else if (rawArgs.includes(",")) {
            args = rawArgs.split(",").map((s) => s.trim());
        } else {
            args = [rawArgs.trim()];
        }
    } else if (Array.isArray(rawArgs)) {
        args = rawArgs;
    }

    args = args.map((arg: any) => resolveVariable(arg, context));

    console.log(`   📖 Executing Contract Reader: ${signature} on ${address}`);
    console.log(`      Args:`, args);

    const publicClient = createPublicClient({
        transport: RPC_URL ? http(RPC_URL) : http(), 
        chain: baseSepolia 
    });
    
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

        const resultValue = typeof contract === 'bigint' ? contract.toString() : contract;

        return {
            "CONTRACT_RESULT": resultValue,
            "STATUS": "Success" 
        };
    } catch (e: any) {
        throw new Error(`Read Failed: ${e.shortMessage || e.message}`);
    }
};