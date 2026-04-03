import { parseAbi, type PublicClient } from "viem";
import { KNOWN_TOKENS } from "./tokenRegistry.js";

export const resolveTokenDetails = async (
    tokenSymbol: string,
    customInputRaw: string | undefined, // Renamed from customAddressRaw to reflect hybrid nature
    publicClient: PublicClient
) => {
    // 1. Handle "Custom" Selection (Hybrid Logic)
    if (tokenSymbol === "Custom") {
        if (!customInputRaw) {
            throw new Error("Custom token selected but no address or symbol provided.");
        }
        
        const rawInput = customInputRaw.trim();

        // 🟢 HYBRID CHECK: Is it a contract address (starts with 0x)?
        if (rawInput.startsWith("0x")) {
            const address = rawInput.toLowerCase() as `0x${string}`;
            
            // Native ETH placeholders
            if (address === "0x0000000000000000000000000000000000000000" || address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
                 return { address, decimals: 18, isNative: true };
            }

            // Fetch decimals dynamically from the blockchain
            try {
                const decimals = await publicClient.readContract({
                    address,
                    abi: parseAbi(["function decimals() view returns (uint8)"]),
                    functionName: "decimals"
                });
                return { address, decimals, isNative: false };
            } catch (e) {
                console.warn(`Could not fetch decimals for ${address}, defaulting to 18.`);
                return { address, decimals: 18, isNative: false };
            }
        } 
        // 🟢 HYBRID CHECK: It's not an address, treat it as a Token Symbol (e.g., "USDC")
        else {
            const symbolUpper = rawInput.toUpperCase();
            const config = KNOWN_TOKENS[symbolUpper];
            
            if (!config) {
                throw new Error(`Token symbol "${rawInput}" is not in the registry, and is not a valid 0x address. Please provide a contract address.`);
            }
            
            console.log(`   🔎 Hybrid Resolver: Mapped symbol "${rawInput}" to address ${config.address}`);
            return config;
        }
    }

    // 2. Handle standard dropdown selections
    const config = KNOWN_TOKENS[tokenSymbol];
    if (!config) {
        throw new Error(`Token ${tokenSymbol} is not supported natively. Please select 'Custom'.`);
    }

    return config;
};