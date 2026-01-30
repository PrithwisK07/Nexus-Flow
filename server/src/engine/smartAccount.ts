import { createPublicClient, http, parseEther, getAddress } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { entryPoint07Address } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { encodeUSDCTransfer } from "./erc20.js";

import dotenv from "dotenv";
dotenv.config();

const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY;
const PRIVATE_KEY = process.env.MASTER_KEY as `0x${string}`;
const RPC_URL = process.env.RPC_URL as string;
const USDC_ADDRESS = process.env.USDC_ADDRESS as`0x${string}`;

const transportUrl = `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`;

export const createNexusAccount = async (userIndex: number) => {

    const signer = privateKeyToAccount(PRIVATE_KEY);

    const publicClient = createPublicClient({
        transport: http(RPC_URL),
        chain: sepolia,
    })

    const pimlicoClient = createPimlicoClient({
        transport: http(transportUrl),
        entryPoint: {
            address: entryPoint07Address,
            version: "0.7"
        }
    })

    const safeAccount = await toSafeSmartAccount({
        client: publicClient,
        entryPoint: {
            address: entryPoint07Address,
            version: "0.7"
        }, 
        owners: [signer],
        version: "1.4.1",
    })

    const nexusClient = createSmartAccountClient({
        account: safeAccount,
        chain: sepolia,
        bundlerTransport: http(transportUrl),
        paymaster: pimlicoClient,
        userOperation: {
            estimateFeesPerGas: async () => {
                return (await pimlicoClient.getUserOperationGasPrice()).fast;
        },
        }
    })

    console.log(`Generated Nexus-Safe Address: ${safeAccount.address}`);
    return nexusClient;
}

export const sendTestTransaction = async (
    nexusClient: any,
    toAddress: string,
    amount: string,
    type: 'USDC' | 'ETH' = 'ETH'
) => {

    let txData = "0x";
    let txTo = getAddress(toAddress);
    let txValue = parseEther(amount);
    
    if (type === 'USDC') {
        console.log("Token mode: USDC");

        txTo = USDC_ADDRESS;
        txValue = parseEther("0");

        try {
            txData = encodeUSDCTransfer(toAddress, amount);
        } catch (error: any) {
            console.error(`🛑 STOP: ${error}`);
            return { success: false };
        }
    }

    console.log(`🛠️ Sending ${amount} ${type} to ${txTo}...`);

    const txHash = await nexusClient.sendTransaction({
        to: txTo, 
        value: txValue, 
        data: txData, 
    });

    console.log(`✅ Transaction Sent! Hash: ${txHash}`);
    console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/tx/${txHash}`);
    return {success: true, hash:txHash};
}