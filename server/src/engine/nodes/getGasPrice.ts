import { createPublicClient, http, formatGwei } from "viem";
import { sepolia } from "viem/chains";
import dotenv from "dotenv";

dotenv.config();
const RPC_URL = process.env.RPC_URL as string;

export const getGasPrice = async () => {
    const publicClient = createPublicClient({
        transport: http(RPC_URL),
        chain: sepolia
    })

    const gasPrice = await publicClient.getGasPrice();
    const gweiPrice = formatGwei(gasPrice);

    console.log(`      -> Current Gas: ${gweiPrice} Gwei`);

    return {
        "GAS_PRICE": Number(gweiPrice)
    };
}