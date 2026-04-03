import { resolveVariable, type ExecutionContext } from "../variableResolver.js";
import { createNexusAccount } from "../smartAccount.js";
import { Sanitize } from "../utils/inputSanitizer.js";
import { resolveTokenDetails } from "../utils/tokenUtils.js"; // 🟢 Added the Universal Token Resolver
import { createPublicClient, http, parseAbi, encodeFunctionData, parseUnits, formatUnits } from "viem";
import { baseSepolia } from "viem/chains"; 

type ActionInput = Record<string, any>;

export const transfer = async (inputs: ActionInput, context: ExecutionContext) => {
    // 🟢 Updated to match the new frontend input names with fallbacks for older configurations
    const toRaw = resolveVariable(inputs.recipient, context) || resolveVariable(inputs.toAddress, context);
    const toAddress = Sanitize.address(toRaw);
    const rawAmt = resolveVariable(inputs.amount, context);
    const amount = Sanitize.number(rawAmt);
    
    // 🟢 Resolve the token inputs
    const selectedToken = resolveVariable(inputs.token, context) || resolveVariable(inputs.currency, context) || "ETH";
    const customTokenRaw = resolveVariable(inputs.customToken, context);

    if (!toAddress || !toAddress.startsWith("0x")) {
        throw new Error(`Invalid Destination Address: ${toRaw}`);
    }

    // 🟢 Initialize public client early so we can pass it to the token resolver
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

    // 🟢 THE MAGIC: Dynamically resolve known tokens or fetch custom token decimals from the blockchain!
    const tokenConfig = await resolveTokenDetails(selectedToken, customTokenRaw, publicClient);
    
    const tokenAddress = tokenConfig.address as `0x${string}`;
    const amountBigInt = parseUnits(amount.toString(), tokenConfig.decimals);

    console.log(`   ➡️ Executing Transfer Node: Sending ${amount} ${selectedToken} to ${toAddress} on Base Sepolia...`);

    const nexusClient = await createNexusAccount(0);
    const accountAddress = nexusClient.account.address;

    console.log(`      -> Verifying ${selectedToken} balance for ${accountAddress}...`);

    let balance: bigint;
    if (tokenConfig.isNative) {
        balance = await publicClient.getBalance({ address: accountAddress as `0x${string}` });
    } else {
        const erc20Abi = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);
        balance = await publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [accountAddress as `0x${string}`]
        }) as bigint;
    }

    if (balance < amountBigInt) {
        const missingAmountBigInt = amountBigInt - balance;
        
        const errorPayload = {
            code: "DEPOSIT_REQUIRED",
            tokenSymbol: selectedToken === "Custom" ? "Custom Token" : selectedToken,
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
        // Native ETH Transfer
        calls.push({
            to: toAddress as `0x${string}`,
            value: amountBigInt,
            data: "0x"
        });
    } else {
        // ERC-20 Transfer
        const erc20Abi = parseAbi(["function transfer(address to, uint256 amount)"]);
        const transferData = encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [toAddress as `0x${string}`, amountBigInt]
        });

        calls.push({
            to: tokenAddress,
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