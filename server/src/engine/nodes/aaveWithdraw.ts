import { type ExecutionContext, resolveVariable } from "../variableResolver.js";
import { parseUnits, parseAbi, encodeFunctionData, createPublicClient, http, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { createNexusAccount } from "../smartAccount.js";
import { Sanitize } from "../utils/inputSanitizer.js";
import { AAVE_V3_BASE_SEPOLIA } from "../utils/tokenRegistry.js";
import { resolveTokenDetails } from "../utils/tokenUtils.js";

type ActionInput = Record<string, any>;

export const aaveWithdraw = async (inputs: ActionInput, context: ExecutionContext) => {
    const selectedToken = resolveVariable(inputs.token, context); 
    const customTokenRaw = resolveVariable(inputs.customToken, context);
    const rawAmount = resolveVariable(inputs.amount, context);

    const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
    
    // 🟢 Magic Resolver
    const tokenConfig = await resolveTokenDetails(selectedToken, customTokenRaw, publicClient as any);

    if (tokenConfig.isNative) {
        throw new Error("Aave V3 does not support native ETH directly.");
    }

    const nexusClient = await createNexusAccount(0);
    const accountAddress = nexusClient.account.address;

    console.log(`   👻 Aave V3: Checking withdrawal limits for ${selectedToken}...`);

    // --- 1. PRE-FLIGHT CHECK: Fetch Reserve Data to get the aToken address ---
    const poolAbi = parseAbi([
        "function getReserveData(address asset) view returns ((uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))",
        "function withdraw(address asset, uint256 amount, address to) returns (uint256)"
    ]);

    const reserveData = await publicClient.readContract({
        address: AAVE_V3_BASE_SEPOLIA.POOL as `0x${string}`,
        abi: poolAbi,
        functionName: "getReserveData",
        args: [tokenConfig.address as `0x${string}`]
    });

    const aTokenAddress = reserveData.aTokenAddress;

    // --- 2. PRE-FLIGHT CHECK: Read actual deposited balance ---
    const erc20Abi = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);
    const depositedBalance = await publicClient.readContract({
        address: aTokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [accountAddress as `0x${string}`]
    }) as bigint;

    // 🟢 Friendly Error 1: Nothing to withdraw
    if (depositedBalance === 0n) {
        throw new Error(`Withdrawal Failed: You currently have 0 ${selectedToken} deposited in Aave.`);
    }

    const MAX_UINT256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;
    let amountBigInt: bigint;
    
    if (String(rawAmount).toUpperCase() === "MAX") {
        amountBigInt = MAX_UINT256;
    } else {
        amountBigInt = parseUnits(Sanitize.number(rawAmount).toString(), tokenConfig.decimals);
        
        // 🟢 Friendly Error 2: Trying to withdraw more than they have
        if (amountBigInt > depositedBalance) {
            const formattedBalance = formatUnits(depositedBalance, tokenConfig.decimals);
            throw new Error(`Withdrawal Failed: You requested ${rawAmount} ${selectedToken}, but only have ${formattedBalance} deposited.`);
        }
    }

    console.log(`   👻 Aave V3: Executing withdrawal...`);

    // --- 3. EXECUTE TRANSACTION ---
    const calls = [{
        to: AAVE_V3_BASE_SEPOLIA.POOL as `0x${string}`,
        value: 0n,
        data: encodeFunctionData({
            abi: poolAbi,
            functionName: "withdraw",
            args: [
                tokenConfig.address as `0x${string}`, 
                amountBigInt, 
                accountAddress as `0x${string}`
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