import { createPublicClient, http, parseAbi, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { resolveVariable, type ExecutionContext } from "../variableResolver.js";
import { Sanitize } from "../utils/inputSanitizer.js";
import { KNOWN_TOKENS } from "../utils/tokenRegistry.js"; 

type ActionInput = Record<string, any>;

export const walletBalance = async (inputs: ActionInput, context: ExecutionContext) => {
    // 1. Resolve inputs
    const walletAddress = Sanitize.address(resolveVariable(inputs.walletAddress, context));
    const selectedToken = resolveVariable(inputs.token, context) || "ETH"; // Default to ETH
    
    console.log(`   👛 Executing Wallet Reader: Checking balance for ${walletAddress} on Base Sepolia...`);

    // 2. Setup Viem Client
    const publicClient = createPublicClient({
        chain: baseSepolia, 
        transport: http()
    });

    let rawBalance: bigint;
    let decimals = 18;
    let tokenSymbol = "ETH";
    let isNative = true;
    let tokenAddress = "";

    // 3. Determine token configuration based on UI selection
    if (KNOWN_TOKENS[selectedToken]) {
        // Known Token (ETH, USDC, etc.)
        const config = KNOWN_TOKENS[selectedToken];
        isNative = config.isNative;
        decimals = config.decimals;
        tokenAddress = config.address;
        tokenSymbol = selectedToken;
    } else {
        // Custom Token Fallback
        const rawCustom = resolveVariable(inputs.customToken || inputs.tokenAddress, context);
        isNative = !rawCustom || rawCustom.toUpperCase() === "ETH" || rawCustom === "0x0000000000000000000000000000000000000000";
        tokenSymbol = isNative ? "ETH" : "CustomToken";
        
        if (!isNative) {
            tokenAddress = Sanitize.address(rawCustom);
            try {
                decimals = await publicClient.readContract({
                    address: tokenAddress as `0x${string}`,
                    abi: parseAbi(["function decimals() view returns (uint8)"]),
                    functionName: "decimals"
                });
            } catch (e) {
                console.log(`      ⚠️ Could not read decimals from contract, defaulting to 18.`);
                decimals = inputs.decimals ? Number(resolveVariable(inputs.decimals, context)) : 18;
            }
        }
    }

    try {
        // 4. Fetch the Balance
        if (isNative) {
            // Fetch Native ETH Balance
            rawBalance = await publicClient.getBalance({ 
                address: walletAddress as `0x${string}` 
            });
        } else {
            // Fetch ERC-20 Balance
            const erc20Abi = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);
            rawBalance = await publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [walletAddress as `0x${string}`]
            }) as bigint;
        }

        // 5. Format to readable decimal using the fetched/known decimals
        const formattedBalance = formatUnits(rawBalance, decimals);

        console.log(`      -> Balance: ${formattedBalance} ${tokenSymbol}`);

        return {
            "BALANCE": formattedBalance,
            "STATUS": "Success"
        };

    } catch (error: any) {
        throw new Error(`Failed to read wallet balance: ${error.message}`);
    }
};