import { parseUnits, encodeFunctionData } from "viem";

const ERC20_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

export const encodeUSDCTransfer = (toAddress: string, amount: string) => {
    // USDC has 6 decimals unlike Eth's 18.
    const gweiAmt = parseUnits(amount, 6); 

    const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [toAddress as `0x${string}`, gweiAmt]
    })

    return data;
}

