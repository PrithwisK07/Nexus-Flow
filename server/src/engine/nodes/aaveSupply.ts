import { encodeFunctionData, parseAbi, parseUnits } from "viem"; 
import { type ExecutionContext, resolveVariable } from "../variableResolver.js";
import { createNexusAccount } from "../smartAccount.js";
import { Sanitize } from "../utils/inputSanitizer.js";

type ActionInput = Record<string, any>;

export const getAaveSupply = async (inputs: ActionInput, context: ExecutionContext) => {
    const asset = Sanitize.address(resolveVariable(inputs.asset, context));
    const rawAmount = resolveVariable(inputs.amount, context);
    const amount = Sanitize.number(rawAmount);
    const onBehalfOf = resolveVariable(inputs.onBehalfOf, context);
    const decimals = inputs.decimals ? Number(inputs.decimals) : 18;
    
    const AAVE_POOL = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";

    console.log(`   👻 Executing Aave Supply: Supplying ${amount} of ${asset}...`);

    const aaveAbi = parseAbi([
        "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)"
    ]);
    
    const amountBigInt = parseUnits(amount.toString(), decimals);

    const data = encodeFunctionData({
        abi: aaveAbi,
        functionName: "supply",
        args: [
            asset as `0x${string}`,
            amountBigInt,
            onBehalfOf as `0x${string}`,
            0
        ]
    });
    
    const nexusClient = await createNexusAccount(0);
        
    const txHash = await nexusClient.sendTransaction({
        to: AAVE_POOL,
        value: 0n,
        data: data
    });

    // --- NEW: Generate Explorer Link ---
    const explorerLink = `https://sepolia.etherscan.io/tx/${txHash}`;

    console.log(`      -> Supplied to Aave! Hash: ${txHash}`);
    console.log(`      🔗 View on Etherscan: ${explorerLink}`);

    return { 
        "TX_HASH": txHash,
        "EXPLORER_LINK": explorerLink
    };
};