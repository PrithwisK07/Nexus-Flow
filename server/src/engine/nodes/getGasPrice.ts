import { createPublicClient, http, formatGwei } from "viem";
import { baseSepolia } from "viem/chains"; 
import dotenv from "dotenv";

dotenv.config();

export const getGasPrice = async () => {
    console.log(`   ⛽ Fetching Current Gas Price on Base Sepolia...`);

    const rpcUrl = process.env.RPC_URL; 

    const publicClient = createPublicClient({
        transport: rpcUrl ? http(rpcUrl) : http(),
        chain: baseSepolia 
    });

    try {
        const gasPrice = await publicClient.getGasPrice();
        const gweiPrice = formatGwei(gasPrice);

        console.log(`      -> Current Gas: ${gweiPrice} Gwei`);

        return {
            "GAS_PRICE": Number(gweiPrice),
            "STATUS": "Success"
        };
    } catch (error: any) {
        throw new Error(`Failed to fetch gas price: ${error.message}`);
    }
}