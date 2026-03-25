import { type ExecutionContext, resolveVariable } from "../variableResolver.js";
import { parseUnits, parseAbi, encodeFunctionData } from "viem";
import { createNexusAccount } from "../smartAccount.js";
import { Sanitize } from "../utils/inputSanitizer.js";
import { AAVE_V3_BASE_SEPOLIA } from "../utils/tokenRegistry.js";

type ActionInput = Record<string, any>;

export const aaveWithdraw = async (inputs: ActionInput, context: ExecutionContext) => {
    const selectedAsset = resolveVariable(inputs.asset, context); 
    const rawAmount = resolveVariable(inputs.amount, context);

    const assetConfig = AAVE_V3_BASE_SEPOLIA.ASSETS[selectedAsset as keyof typeof AAVE_V3_BASE_SEPOLIA.ASSETS];
    if (!assetConfig) throw new Error(`Asset ${selectedAsset} is not supported on Aave V3 Base Sepolia.`);

    const nexusClient = await createNexusAccount(0);
    const accountAddress = nexusClient.account.address;

    console.log(`   👻 Aave V3: Withdrawing ${rawAmount} ${selectedAsset}...`);

    // Handle "MAX" logic (Aave uses type(uint256).max to signify withdrawing 100% of balance)
    const MAX_UINT256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;
    
    let amountBigInt: bigint;
    if (String(rawAmount).toUpperCase() === "MAX") {
        amountBigInt = MAX_UINT256;
    } else {
        amountBigInt = parseUnits(Sanitize.number(rawAmount).toString(), assetConfig.decimals);
    }

    // --- 1. THE WITHDRAW CALL ---
    // Note: Withdraw doesn't require approval because the Pool burns the aTokens directly from the sender
    const poolAbi = parseAbi([
        "function withdraw(address asset, uint256 amount, address to) returns (uint256)"
    ]);

    const calls = [{
        to: AAVE_V3_BASE_SEPOLIA.POOL as `0x${string}`,
        value: 0n,
        data: encodeFunctionData({
            abi: poolAbi,
            functionName: "withdraw",
            args: [
                assetConfig.address as `0x${string}`, 
                amountBigInt, 
                accountAddress as `0x${string}` // The underlying asset is sent back to the Smart Account
            ]
        })
    }];

    const userOpHash = await nexusClient.sendUserOperation({ calls });
    const receipt = await nexusClient.waitForUserOperationReceipt({ hash: userOpHash });
    
    return { 
        "TX_HASH": receipt.receipt.transactionHash,
        "EXPLORER_LINK": `https://sepolia.basescan.org/tx/${receipt.receipt.transactionHash}`,
        "STATUS": "Success"
    };
};