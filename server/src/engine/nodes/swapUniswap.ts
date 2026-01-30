import { type ExecutionContext } from "../variableResolver.js"
import { resolveVariable } from "../variableResolver.js";
import { parseUnits } from "viem";
import { encodeSwap, UNISWAP_ROUTER } from "../uniswap.js";
import { createNexusAccount } from "../smartAccount.js";

type ActionInput = Record<string, any>;

export const swapUniswap = async (inputs: ActionInput, context: ExecutionContext) => {
    const tokenIn = resolveVariable(inputs.tokenIn, context);
    const tokenOut = resolveVariable(inputs.tokenOut, context);
    const amount = resolveVariable(inputs.amountIn, context);
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

    console.log(`      -> Swap Submitted! Hash: ${txHash}`);
    return { "SWAP_TX_HASH": txHash };

};