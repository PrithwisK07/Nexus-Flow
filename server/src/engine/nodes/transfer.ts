import { resolveVariable, type ExecutionContext } from "../variableResolver.js";
import { createNexusAccount } from "../smartAccount.js";
import { Sanitize } from "../utils/inputSanitizer.js";
import { KNOWN_TOKENS } from "../utils/tokenRegistry.js";
import { createPublicClient, http, parseAbi, encodeFunctionData, parseUnits, formatUnits } from "viem";
import { baseSepolia } from "viem/chains"; 

type ActionInput = Record<string, any>;

export const transfer = async (inputs: ActionInput, context: ExecutionContext) => {
    const toRaw = resolveVariable(inputs.toAddress, context);
    const toAddress = Sanitize.address(toRaw);
    const rawAmt = resolveVariable(inputs.amount, context);
    const amount = Sanitize.number(rawAmt);
    const selectedToken = resolveVariable(inputs.currency, context);

    if (!toAddress || !toAddress.startsWith("0x")) {
        throw new Error(`Invalid Destination Address: ${toRaw}`);
    }

    const tokenConfig = KNOWN_TOKENS[selectedToken] || {
        address: resolveVariable(inputs.customToken, context),
        decimals: 18, 
        isNative: false
    };

    const tokenAddress = Sanitize.address(tokenConfig.address);
    const amountBigInt = parseUnits(amount.toString(), tokenConfig.decimals);

    console.log(`   ➡️ Executing Transfer Node: Sending ${amount} ${selectedToken} to ${toAddress} on Base Sepolia...`);

    const nexusClient = await createNexusAccount(0);
    const accountAddress = nexusClient.account.address;

    console.log(`      -> Verifying ${selectedToken} balance for ${accountAddress}...`);
    
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

    let balance: bigint;
    if (tokenConfig.isNative) {
        balance = await publicClient.getBalance({ address: accountAddress as `0x${string}` });
    } else {
        const erc20Abi = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);
        balance = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [accountAddress as `0x${string}`]
        }) as bigint;
    }

    if (balance < amountBigInt) {
        const missingAmountBigInt = amountBigInt - balance;
        
        const errorPayload = {
            code: "DEPOSIT_REQUIRED",
            tokenSymbol: selectedToken,
            tokenAddress: tokenAddress,
            isNative: tokenConfig.isNative,
            missingAmountRaw: missingAmountBigInt.toString(), 
            missingAmountFormatted: formatUnits(missingAmountBigInt, tokenConfig.decimals),
            accountAddress: accountAddress,
            workflowId: (context as any).SYSTEM_WORKFLOW_ID || null,
        };

        throw new Error(`[ACTION_REQUIRED] ${JSON.stringify(errorPayload)}`);
    }
    console.log(`      -> Balance verified! Building transaction...`);

    const calls: any[] = [];

    if (tokenConfig.isNative) {
        
        calls.push({
            to: toAddress as `0x${string}`,
            value: amountBigInt,
            data: "0x"
        });
    } else {
        
        const erc20Abi = parseAbi(["function transfer(address to, uint256 amount)"]);
        const transferData = encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [toAddress as `0x${string}`, amountBigInt]
        });

        calls.push({
            to: tokenAddress as `0x${string}`,
            value: 0n,
            data: transferData
        });
    }

    console.log(`      -> Sending UserOperation...`);
    const userOpHash = await nexusClient.sendUserOperation({ calls });
    
    console.log(`      -> UserOp Sent (Hash: ${userOpHash}). Waiting for bundler...`);

    const receipt = await nexusClient.waitForUserOperationReceipt({ hash: userOpHash });
    const txHash = receipt.receipt.transactionHash;

    const explorerLink = `https://sepolia.basescan.org/tx/${txHash}`;
    console.log(`      ✅ Transfer Complete! Hash: ${txHash}`);
    console.log(`      🔗 View on BaseScan: ${explorerLink}`);

    return { 
        "TX_HASH": txHash,
        "EXPLORER_LINK": explorerLink,
        "STATUS": "Success"
    };
};