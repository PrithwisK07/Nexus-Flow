import { type ExecutionContext, resolveVariable } from "../variableResolver.js";
import { parseUnits, parseAbi, encodeFunctionData, createPublicClient, http, formatUnits } from "viem";
import { baseSepolia } from "viem/chains"; 
import { encodeSwap, UNISWAP_ROUTER } from "../uniswap.js";
import { createNexusAccount } from "../smartAccount.js";
import { Sanitize } from "../utils/inputSanitizer.js";
import { KNOWN_TOKENS } from "../utils/tokenRegistry.js";

type ActionInput = Record<string, any>;

export const swapUniswap = async (inputs: ActionInput, context: ExecutionContext) => {
    
    const selectedTokenIn = resolveVariable(inputs.tokenIn, context);
    const selectedTokenOut = resolveVariable(inputs.tokenOut, context);
    
    const tokenInConfig = KNOWN_TOKENS[selectedTokenIn] || {
        address: resolveVariable(inputs.customTokenIn, context),
        decimals: inputs.customDecimals ? Number(resolveVariable(inputs.customDecimals, context)) : 18,
        isNative: inputs.customIsNative === "true"
    };

    const tokenOutConfig = KNOWN_TOKENS[selectedTokenOut] || {
        address: resolveVariable(inputs.customTokenOut, context),
        decimals: 18,
        isNative: false
    };

    const tokenInAddress = Sanitize.address(tokenInConfig.address);
    const tokenOutAddress = Sanitize.address(tokenOutConfig.address);
    
    const WETH_ADDRESS = KNOWN_TOKENS["WETH"]!.address;
    const routerTokenIn = tokenInConfig.isNative ? WETH_ADDRESS : tokenInAddress;
    const routerTokenOut = tokenOutConfig.isNative ? WETH_ADDRESS : tokenOutAddress;

    const rawAmount = resolveVariable(inputs.amountIn, context);
    const amount = Sanitize.number(rawAmount);
    const recipient = resolveVariable(inputs.recipient, context);

    console.log(`   🦄 Executing Uniswap Node: Swapping ${amount} ${selectedTokenIn} to ${selectedTokenOut} on Base Sepolia...`);

    const amountBigInt = parseUnits(amount.toString(), tokenInConfig.decimals);
    
    const calldata = encodeSwap(routerTokenIn, routerTokenOut, amountBigInt, recipient);
    
    const nexusClient = await createNexusAccount(0);
    const accountAddress = nexusClient.account.address;

    console.log(`      -> Verifying ${selectedTokenIn} balance for ${accountAddress}...`);
    
    const publicClient = createPublicClient({
        chain: baseSepolia, 
        transport: http()
    });

    let balance: bigint;

    if (tokenInConfig.isNative) {
        balance = await publicClient.getBalance({ address: accountAddress as `0x${string}` });
    } else {

        const erc20Abi = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);
        balance = await publicClient.readContract({
            address: tokenInAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [accountAddress as `0x${string}`]
        }) as bigint;
    }

    if (balance < amountBigInt) {

        const missingAmountBigInt = amountBigInt - balance;
        
        const errorPayload = {
            code: "DEPOSIT_REQUIRED",
            tokenSymbol: selectedTokenIn === 'Custom' ? 'Custom Token' : selectedTokenIn,
            tokenAddress: tokenInAddress,
            isNative: tokenInConfig.isNative,
            missingAmountRaw: missingAmountBigInt.toString(), // Sent as string to preserve precision
            missingAmountFormatted: formatUnits(missingAmountBigInt, tokenInConfig.decimals),
            accountAddress: accountAddress,
            workflowId: (context as any).SYSTEM_WORKFLOW_ID || null,
        };

        throw new Error(`[ACTION_REQUIRED] ${JSON.stringify(errorPayload)}`);
    }
    
    console.log(`      -> Balance verified! Proceeding with batch...`);

    const calls: any[] = [];

    if (!tokenInConfig.isNative) {
        console.log(`      -> Not native ETH. Batching ERC-20 Approval...`);
        const erc20Abi = parseAbi(["function approve(address spender, uint256 amount)"]);
        
        const approveData = encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [UNISWAP_ROUTER as `0x${string}`, amountBigInt]
        });

        calls.push({
            to: tokenInAddress as `0x${string}`,
            value: 0n,
            data: approveData
        });
    }

    calls.push({
        to: UNISWAP_ROUTER as `0x${string}`,
        value: tokenInConfig.isNative ? amountBigInt : 0n,
        data: calldata
    });

    console.log(`      -> Sending ${calls.length} batched transaction(s) via UserOperation...`);

    const userOpHash = await nexusClient.sendUserOperation({ calls });
    
    console.log(`      -> UserOp Sent (Hash: ${userOpHash}). Waiting for bundler...`);

    const receipt = await nexusClient.waitForUserOperationReceipt({ hash: userOpHash });
    const txHash = receipt.receipt.transactionHash;

    const explorerLink = `https://sepolia.basescan.org/tx/${txHash}`;
    console.log(`      ✅ Swap Complete! Hash: ${txHash}`);

    return { 
        "TX_HASH": txHash,
        "EXPLORER_LINK": explorerLink,
        "STATUS": "Success"
    };
};