import { createPublicClient, http, parseEther, formatEther, parseAbi, parseUnits } from "viem";
import { sepolia } from "viem/chains";
import dotenv from "dotenv";
dotenv.config();

const RPC_URL = process.env.RPC_URL as string;
const USDC_ADDRESS = process.env.USDC_ADDRESS as `0x${string}`;

const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
})

export const validateBalance = async (
    address: `0x${string}`,
    reqAmount: string,
    type: 'ETH' | 'USDC'
): Promise<{ success: boolean; reason: string }> => {
    console.log(`🛡️ Guard Rail: Checking if ${address} has ${reqAmount} ${type}...`);

    try {
        if (type === 'ETH') {
            const balance = await publicClient.getBalance({ address: address });
            const reqAmountInWei = parseEther(reqAmount);

            if (balance < reqAmountInWei) {
                return {
                    success: false,
                    reason: `Insufficient ETH. Has ${formatEther(balance)}, needs ${reqAmount}.`
                };
            }
        } else {
            const abi = parseAbi(["function balanceOf(address) view returns (uint256)"]);
            const balance = await publicClient.readContract({
                abi: abi,
                address: USDC_ADDRESS,
                functionName: "balanceOf",
                args: [address],
            });

            const reqAmountUSDC = parseUnits(reqAmount, 6);

            if (balance < reqAmountUSDC) {
                const readableBalance = Number(balance) / 10 ** 6;
                return {
                    success: false,
                    reason: `Insufficient USDC. Has ${readableBalance}, needs ${reqAmount}.`
                };
            }

        }

        return {
            success: true,
            reason: "Balance Sufficient."
        };
    } catch (error) {
        console.error("❌ Guard Rail Error:", error);
        return { success: false, reason: "Could not fetch balance (RPC Error)" };
    }
}