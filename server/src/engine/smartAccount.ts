import { 
    createPublicClient, 
    http, 
    getAddress, 
    parseUnits, 
    encodeFunctionData, 
    parseAbi 
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { entryPoint07Address } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { KNOWN_TOKENS } from "./utils/tokenRegistry.js"; 

import dotenv from "dotenv";
dotenv.config();

const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY;
const PRIVATE_KEY = process.env.MASTER_KEY as `0x${string}` | undefined;
const RPC_URL = process.env.RPC_URL as string | undefined;

// 84532 is the official Chain ID for Base Sepolia
const transportUrl = `https://api.pimlico.io/v2/84532/rpc?apikey=${PIMLICO_API_KEY}`;

export const createNexusAccount = async (userIndex: number) => {

    if (!PRIVATE_KEY) {
        throw new Error("MASTER_KEY is not configured in server/.env");
    }
    if (!RPC_URL) {
        throw new Error("RPC_URL is not configured in server/.env");
    }
    if (!PIMLICO_API_KEY) {
        throw new Error("PIMLICO_API_KEY is not configured in server/.env");
    }

    const signer = privateKeyToAccount(PRIVATE_KEY);

    const publicClient = createPublicClient({
        transport: http(RPC_URL),
        chain: baseSepolia,
    });

    const pimlicoClient = createPimlicoClient({
        transport: http(transportUrl),
        entryPoint: {
            address: entryPoint07Address,
            version: "0.7"
        }
    });

    const safeAccount = await toSafeSmartAccount({
        client: publicClient,
        entryPoint: {
            address: entryPoint07Address,
            version: "0.7"
        }, 
        owners: [signer],
        version: "1.4.1",
    });

    const nexusClient = createSmartAccountClient({
        account: safeAccount,
        chain: baseSepolia,
        bundlerTransport: http(transportUrl),
        paymaster: pimlicoClient,
        userOperation: {
            estimateFeesPerGas: async () => {
                return (await pimlicoClient.getUserOperationGasPrice()).fast;
        },
        }
    });

    console.log(`Generated Nexus-Safe Address: ${safeAccount.address}`);
    return nexusClient;
}

// 🟢 NEW: Dynamic transfer function that supports ANY token in our registry
export const sendTestTransaction = async (
    nexusClient: any,
    toAddress: string,
    amount: string,
    type: string = 'ETH' // Default to ETH, but can pass 'USDC', 'WETH', etc.
) => {
    let txData = "0x";
    let txTo = getAddress(toAddress);
    let txValue = 0n;

    // Check if it's Native ETH or an ERC-20 token from our registry
    const tokenConfig = KNOWN_TOKENS[type];
    if (!tokenConfig) {
        console.error(`🛑 STOP: Token ${type} is not found in tokenRegistry.ts`);
        return { success: false };
    }

    if (tokenConfig.isNative) {
        console.log(`Token mode: Native ${type}`);
        txValue = parseUnits(amount, 18);
    } else {
        console.log(`Token mode: ERC-20 ${type}`);
        
        txTo = tokenConfig.address as `0x${string}`;
        txValue = 0n; // Sending 0 ETH, only transferring the token
        
        // Use the correct decimals from our registry (e.g. 6 for USDC)
        const amountBigInt = parseUnits(amount, tokenConfig.decimals);
        const erc20Abi = parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]);
        
        try {
            txData = encodeFunctionData({
                abi: erc20Abi,
                functionName: "transfer",
                args: [getAddress(toAddress), amountBigInt]
            });
        } catch (error: any) {
            console.error(`🛑 STOP: Failed to encode transfer data: ${error.message}`);
            return { success: false };
        }
    }

    console.log(`🛠️ Sending ${amount} ${type} to ${toAddress}...`);

    const txHash = await nexusClient.sendTransaction({
        to: txTo, 
        value: txValue, 
        data: txData, 
    });

    console.log(`✅ Transaction Sent! Hash: ${txHash}`);
    
    // 🟢 NEW: Pointing to the correct Base Sepolia Block Explorer
    console.log(`🔗 View on Basescan: https://sepolia.basescan.org/tx/${txHash}`);
    
    return { success: true, hash: txHash };
}