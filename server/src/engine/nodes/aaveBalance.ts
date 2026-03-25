import { type ExecutionContext, resolveVariable } from "../variableResolver.js";
import { parseAbi, createPublicClient, http, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { createNexusAccount } from "../smartAccount.js";
import { AAVE_V3_BASE_SEPOLIA } from "../utils/tokenRegistry.js";

type ActionInput = Record<string, any>;

export const aaveBalance = async (inputs: ActionInput, context: ExecutionContext) => {
    const selectedAsset = resolveVariable(inputs.asset, context); 
    const assetConfig = AAVE_V3_BASE_SEPOLIA.ASSETS[selectedAsset as keyof typeof AAVE_V3_BASE_SEPOLIA.ASSETS];
    if (!assetConfig) throw new Error(`Asset ${selectedAsset} not supported.`);

    const nexusClient = await createNexusAccount(0);
    const accountAddress = nexusClient.account.address;

    const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

    // 1. Ask the Aave Pool for the Reserve Data
    // 🟢 FIX: Provide the exact V3 Struct as a named tuple. 
    // This perfectly aligns the types and prevents the Safe Integer error!
    const poolAbi = parseAbi([
        "function getReserveData(address asset) view returns ((uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))"
    ]);

    const reserveData = await publicClient.readContract({
        address: AAVE_V3_BASE_SEPOLIA.POOL as `0x${string}`,
        abi: poolAbi,
        functionName: "getReserveData",
        args: [assetConfig.address as `0x${string}`]
    });

    // 🟢 FIX: Because we used named parameters in the ABI, viem returns an object, not an array!
    const aTokenAddress = reserveData.aTokenAddress; 

    // 2. Read the balance of the aToken (This natively includes all accrued interest!)
    const erc20Abi = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);
    const rawBalance = await publicClient.readContract({
        address: aTokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [accountAddress as `0x${string}`]
    }) as bigint;

    const formattedBalance = formatUnits(rawBalance, assetConfig.decimals);

    console.log(`   👻 Aave V3: ${accountAddress} has ${formattedBalance} a${selectedAsset}`);

    return { 
        "BALANCE": formattedBalance,
        "RAW_BALANCE": rawBalance.toString(),
        "STATUS": "Success"
    };
};