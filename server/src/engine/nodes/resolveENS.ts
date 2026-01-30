import { createPublicClient, http } from "viem";
import { resolveVariable, type ExecutionContext } from "../variableResolver.js";
import { mainnet } from "viem/chains";

type ActionInput = Record<string, any>;

export const resolveENS = async (inputs: ActionInput, context: ExecutionContext) => {
    const domain = resolveVariable(inputs.domain, context);
    console.log(`   🔍 Executing ENS Node: Looking up ${domain}...`);
    
    const mainnetClient = createPublicClient({
        chain: mainnet,
        transport: http("https://ethereum.publicnode.com"),
    })

    const address = await mainnetClient.getEnsAddress({
        name: domain,
    });

    if (!address) {
        throw new Error(`ENS name ${domain} could not be resolved.`);
    }
    
    console.log(`      -> Resolved to ${address}`);
    return { "ENS_ADDRESS": address };
};