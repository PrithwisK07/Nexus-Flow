import { type ExecutionContext, resolveVariable } from "../variableResolver.js";
import { parseUnits, parseAbi, encodeFunctionData, createPublicClient, http, formatUnits } from "viem";
import { baseSepolia } from "viem/chains"; 
import { createNexusAccount } from "../smartAccount.js";
import { Sanitize } from "../utils/inputSanitizer.js";
import { AAVE_V3_BASE_SEPOLIA } from "../utils/tokenRegistry.js";

type ActionInput = Record<string, any>;

export const aaveSupply = async (inputs: ActionInput, context: ExecutionContext) => {
    const selectedAsset = resolveVariable(inputs.asset, context); // e.g., "USDC"
    const rawAmount = resolveVariable(inputs.amount, context);
    const amount = Sanitize.number(rawAmount);

    const assetConfig = AAVE_V3_BASE_SEPOLIA.ASSETS[selectedAsset as keyof typeof AAVE_V3_BASE_SEPOLIA.ASSETS];
    if (!assetConfig) throw new Error(`Asset ${selectedAsset} is not supported on Aave V3 Base Sepolia.`);

    const assetAddress = assetConfig.address;
    const amountBigInt = parseUnits(amount.toString(), assetConfig.decimals);
    
    const nexusClient = await createNexusAccount(0);
    const accountAddress = nexusClient.account.address;

    console.log(`   👻 Aave V3: Supplying ${amount} ${selectedAsset} on Base Sepolia...`);

    // --- 1. PRE-FLIGHT BALANCE CHECK (With Actionable Error) ---
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
    const erc20Abi = parseAbi([
        "function balanceOf(address owner) view returns (uint256)",
        "function approve(address spender, uint256 amount)"
    ]);
    
    const balance = await publicClient.readContract({
        address: assetAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [accountAddress as `0x${string}`]
    }) as bigint;

    if (balance < amountBigInt) {
        throw new Error(`[ACTION_REQUIRED] ${JSON.stringify({
            code: "DEPOSIT_REQUIRED",
            tokenSymbol: selectedAsset,
            tokenAddress: assetAddress,
            isNative: false,
            missingAmountRaw: (amountBigInt - balance).toString(),
            missingAmountFormatted: formatUnits(amountBigInt - balance, assetConfig.decimals),
            accountAddress: accountAddress
        })}`);
    }

    const calls: any[] = [];

    // --- 2. BATCH 1: ERC-20 APPROVAL ---
    calls.push({
        to: assetAddress as `0x${string}`,
        value: 0n,
        data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [AAVE_V3_BASE_SEPOLIA.POOL as `0x${string}`, amountBigInt]
        })
    });

    // --- 3. BATCH 2: THE SUPPLY CALL ---
    const poolAbi = parseAbi([
        "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)"
    ]);

    calls.push({
        to: AAVE_V3_BASE_SEPOLIA.POOL as `0x${string}`,
        value: 0n,
        data: encodeFunctionData({
            abi: poolAbi,
            functionName: "supply",
            args: [
                assetAddress as `0x${string}`, 
                amountBigInt, 
                accountAddress as `0x${string}`, // 🟢 MUST be the smart account!
                0 // referralCode
            ]
        })
    });

    // --- 4. EXECUTE ---
    const userOpHash = await nexusClient.sendUserOperation({ calls });
    const receipt = await nexusClient.waitForUserOperationReceipt({ hash: userOpHash });
    
    return { 
        "TX_HASH": receipt.receipt.transactionHash,
        "EXPLORER_LINK": `https://sepolia.basescan.org/tx/${receipt.receipt.transactionHash}`,
        "SUPPLIED_AMOUNT": amount,
        "STATUS": "Success"
    };
};