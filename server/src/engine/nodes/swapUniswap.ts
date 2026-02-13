import { type ExecutionContext } from "../variableResolver.js"
import { resolveVariable } from "../variableResolver.js";
import { parseUnits } from "viem";
import { encodeSwap, UNISWAP_ROUTER } from "../uniswap.js";
import { createNexusAccount } from "../smartAccount.js";
import { Sanitize } from "../utils/inputSanitizer.js";

type ActionInput = Record<string, any>;

export const swapUniswap = async (inputs: ActionInput, context: ExecutionContext) => {
    const tokenIn = Sanitize.address(resolveVariable(inputs.tokenIn, context));
    const tokenOut = Sanitize.address(resolveVariable(inputs.tokenOut, context));
    const rawAmount = resolveVariable(inputs.amountIn, context);
    const amount = Sanitize.number(rawAmount);
    const recipient = resolveVariable(inputs.recipient, context);
    const decimals = inputs.tokenInDecimals || 18;
    const isNative = inputs.isNativeIn === true;

    console.log(`   🦄 Executing Uniswap Node: Swapping ${amount} of ${tokenIn}...`);

    const amountBigInt = parseUnits(amount.toString(), decimals);
    const calldata = encodeSwap(tokenIn, tokenOut, amountBigInt, recipient);
    
    const nexusClient = await createNexusAccount(0);

    const txHash = await nexusClient.sendTransaction({
        to: UNISWAP_ROUTER,
        value: isNative ? amountBigInt : 0n,
        data: calldata
    });

    // --- NEW: Generate Explorer Link ---
    const explorerLink = `https://sepolia.etherscan.io/tx/${txHash}`;

    console.log(`      -> Swap Submitted! Hash: ${txHash}`);
    console.log(`      🔗 View on Etherscan: ${explorerLink}`);

    return { 
        "TX_HASH": txHash,
        "EXPLORER_LINK": explorerLink
    };
};