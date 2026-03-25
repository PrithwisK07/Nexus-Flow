import { resolveVariable, type ExecutionContext } from "../variableResolver.js";
import { parseAbi, encodeFunctionData, type Abi } from "viem";
import { createNexusAccount } from "../smartAccount.js";
import { Sanitize } from "../utils/inputSanitizer.js";

type ActionInput = Record<string, any>;

export const writeContract = async (inputs: ActionInput, context: ExecutionContext) => {
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

    args = Sanitize.array(args).map(arg => resolveVariable(arg, context));

    let msgValue = 0n;
    const rawValue = resolveVariable(inputs.value, context);
    if (rawValue && String(rawValue).trim() !== "") {
        msgValue = BigInt(Sanitize.number(rawValue));
    }

    console.log(`   ✍️ Executing Contract Writer: ${signature} on ${address}`);

    const abi = parseAbi([signature]);
    const funcName = signature.split("function ")[1].split("(")[0].trim();

    const data = encodeFunctionData({
        abi: abi as Abi,
        functionName: funcName,
        args: args
    });

    const nexusClient = await createNexusAccount(0);
        
    const calls = [{
        to: address as `0x${string}`,
        value: msgValue,
        data: data
    }];

    const userOpHash = await nexusClient.sendUserOperation({ calls });
    console.log(`      -> UserOp Sent (Hash: ${userOpHash}). Waiting for bundler...`);

    const receipt = await nexusClient.waitForUserOperationReceipt({ hash: userOpHash });
    const txHash = receipt.receipt.transactionHash;

    const explorerLink = `https://sepolia.basescan.org/tx/${txHash}`;

    console.log(`      ✅ Transaction Complete! Hash: ${txHash}`);
    console.log(`      🔗 View on Basescan: ${explorerLink}`);

    return { 
        "TX_HASH": txHash,
        "EXPLORER_LINK": explorerLink,
        "STATUS": "Success"
    };
};