import { type ExecutionContext, resolveVariable } from "../variableResolver.js";
import { parseAbi, createPublicClient, http, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { createNexusAccount } from "../smartAccount.js";
import { AAVE_V3_BASE_SEPOLIA } from "../utils/tokenRegistry.js";
import { resolveTokenDetails } from "../utils/tokenUtils.js"; // 🟢 Import Hybrid Resolver

type ActionInput = Record<string, any>;

export const aaveBalance = async (inputs: ActionInput, context: ExecutionContext) => {
    // 🟢 Fix: Use 'token' and 'customToken' to match new UI config
    const selectedToken = resolveVariable(inputs.token, context); 
    const customTokenRaw = resolveVariable(inputs.customToken, context);

    const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
    
    // 🟢 Magic Resolver handles Custom Symbols & Addresses
    const tokenConfig = await resolveTokenDetails(selectedToken, customTokenRaw, publicClient as any);

    if (tokenConfig.isNative) {
        throw new Error("Aave V3 does not support native ETH directly. Please check WETH balance.");
    }

    const nexusClient = await createNexusAccount(0);
    const accountAddress = nexusClient.account.address;

    // 1. Ask the Aave Pool for the Reserve Data
    const poolAbi = parseAbi([
        "function getReserveData(address asset) view returns ((uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))"
    ]);

    const reserveData = await publicClient.readContract({
        address: AAVE_V3_BASE_SEPOLIA.POOL as `0x${string}`,
        abi: poolAbi,
        functionName: "getReserveData",
        args: [tokenConfig.address as `0x${string}`]
    });

    const aTokenAddress = reserveData.aTokenAddress; 

    // 2. Read the balance of the aToken (includes accrued interest)
    const erc20Abi = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);
    const rawBalance = await publicClient.readContract({
        address: aTokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [accountAddress as `0x${string}`]
    }) as bigint;

    const formattedBalance = formatUnits(rawBalance, tokenConfig.decimals);

    console.log(`   👻 Aave V3: ${accountAddress} has ${formattedBalance} a${selectedToken}`);

    return { 
        "BALANCE": formattedBalance,
        "RAW_BALANCE": rawBalance.toString(),
        "STATUS": "Success"
    };
};