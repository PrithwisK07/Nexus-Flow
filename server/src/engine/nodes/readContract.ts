import { createPublicClient, parseAbi, http } from "viem";
import { resolveVariable, type ExecutionContext } from "../variableResolver.js";
import { sepolia } from "viem/chains";
import dotenv from "dotenv";

dotenv.config();
const RPC_URL = process.env.RPC_URL as string;

type ActionInput = Record<string, any>;
export const readContract = async (inputs: ActionInput, context: ExecutionContext) => {
    const address = resolveVariable(inputs.contractAddress, context);
    const signature = resolveVariable(inputs.functionSignature, context);
    
    let args = inputs.args || [];

    console.log(`   📖 Executing Contract Reader: ${signature} on ${address}`);

    if (Array.isArray(args)) {
        args = args.map((arg: any) => resolveVariable(arg, context));
    }

    const publicClient = createPublicClient({
        transport: http(RPC_URL),
        chain: sepolia
    })
    
    const parsedAbi = parseAbi([signature]);

    const funcName = signature.split("function ")[1].split("(")[0].trim();

    const contract = await publicClient.readContract({
        address: address as `0x${string}`,
        abi: parsedAbi,
        functionName: funcName,
        args: args
    });

    console.log(`      -> Result: ${contract}`);

    return {
        "CONTRACT_RESULT": contract
    };
};