import { resolveVariable, type ExecutionContext } from "../variableResolver.js";

type ActionInput = Record<string, any>;

export const getPriceCoinGecko = async (inputs: ActionInput, context: ExecutionContext) => {
    const tokenId = resolveVariable(inputs.tokenId, context); 
    console.log(`   💰 Executing Price Node: Fetching price for ${tokenId}...`);

    const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`
    );
    const data = await response.json();
        
    if (!data[tokenId] || !data[tokenId].usd) {
        throw new Error(`Price not found for ${tokenId}`);
    }

    const price = data[tokenId].usd;
    console.log(`      -> Price is $${price}`);

    return { [`${tokenId.toUpperCase()}_PRICE`]: price };
};