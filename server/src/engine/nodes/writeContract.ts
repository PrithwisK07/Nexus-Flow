import { resolveVariable } from "../variableResolver.js";
import { parseAbi, encodeFunctionData, type Abi } from "viem";
import { createNexusAccount } from "../smartAccount.js";
import { type ExecutionContext } from "../variableResolver.js";

type ActionInput = Record<string, any>;

export const writeContract = async (inputs: ActionInput, context: ExecutionContext) => {
    const address = resolveVariable(inputs.contractAddress, context);
    const signature = resolveVariable(inputs.functionSignature, context);
    let args = inputs.args || [];

    console.log(`   ✍️ Executing Contract Writer: ${signature} on ${address}`);

    if (Array.isArray(args)) {
        args = args.map((arg: any) => resolveVariable(arg, context));
    }

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
    return { "WRITE_TX_HASH": txHash };
};