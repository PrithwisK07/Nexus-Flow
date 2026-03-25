import { createPublicClient, http, parseAbi, parseUnits, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { KNOWN_TOKENS } from "./utils/tokenRegistry.js";
import dotenv from "dotenv";
dotenv.config();

export const validateBalance = async (
    accountAddress: string,
    reqAmount: string, 
    tokenSymbol: string 
): Promise<void> => {
    console.log(`   🛡️ Guardrail: Verifying ${accountAddress} has ${reqAmount} ${tokenSymbol}...`);

    const tokenConfig = KNOWN_TOKENS[tokenSymbol.toUpperCase()];
    if (!tokenConfig) {
        throw new Error(`Guardrail Error: Token ${tokenSymbol} is not configured in the registry.`);
    }

    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(process.env.RPC_URL || undefined),
    });

    const amountBigInt = parseUnits(reqAmount.toString(), tokenConfig.decimals);
    let balance: bigint;

    try {
        if (tokenConfig.isNative) {
            balance = await publicClient.getBalance({ address: accountAddress as `0x${string}` });
        } else {
            const erc20Abi = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);
            balance = await publicClient.readContract({
                address: tokenConfig.address as `0x${string}`,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [accountAddress as `0x${string}`]
            }) as bigint;
        }

        if (balance < amountBigInt) {
            const missingAmountBigInt = amountBigInt - balance;
            
            const errorPayload = {
                code: "DEPOSIT_REQUIRED",
                tokenSymbol: tokenSymbol.toUpperCase(),
                tokenAddress: tokenConfig.address,
                isNative: tokenConfig.isNative,
                missingAmountRaw: missingAmountBigInt.toString(), 
                missingAmountFormatted: formatUnits(missingAmountBigInt, tokenConfig.decimals),
                accountAddress: accountAddress
            };

            console.warn(`      ❌ Insufficient balance! Triggering frontend deposit modal...`);
            
            throw new Error(`[ACTION_REQUIRED] ${JSON.stringify(errorPayload)}`);
        }

        console.log(`      ✅ Guardrail Passed: Balance is sufficient.`);
        
    } catch (error: any) {
        if (error.message && error.message.startsWith('[ACTION_REQUIRED]')) {
            throw error;
        }
        
        console.error("❌ Guardrail RPC Error:", error);
        throw new Error(`Failed to fetch balance for guardrail: ${error.message}`);
    }
}