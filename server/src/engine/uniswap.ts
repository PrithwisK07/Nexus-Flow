import { encodeFunctionData } from "viem";

export const UNISWAP_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

const exactInputSingleABI = [
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "tokenIn", "type": "address" },
          { "internalType": "address", "name": "tokenOut", "type": "address" },
          { "internalType": "uint24", "name": "fee", "type": "uint24" },
          { "internalType": "address", "name": "recipient", "type": "address" },
          { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
          { "internalType": "uint256", "name": "amountOutMinimum", "type": "uint256" },
          { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
        ],
        "internalType": "struct IV3SwapRouter.ExactInputSingleParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "exactInputSingle",
    "outputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

export const encodeSwap = (
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    recipient: string
) => {
    
    const poolFee = 3000; 

    const data = encodeFunctionData({
        abi: exactInputSingleABI,
        functionName: "exactInputSingle",
        args: [{
            tokenIn: tokenIn as `0x${string}`,
            tokenOut: tokenOut as `0x${string}`,
            fee: poolFee,
            recipient: recipient as `0x${string}`,
            amountIn: amountIn,
            amountOutMinimum: 0n,
            sqrtPriceLimitX96: 0n
        }]
    });

    return data;
};