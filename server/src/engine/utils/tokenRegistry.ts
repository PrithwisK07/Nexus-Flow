export const KNOWN_TOKENS: Record<string, { address: string, decimals: number, isNative: boolean }> = {
    "ETH":  { 
        address: "0x0000000000000000000000000000000000000000", 
        decimals: 18, 
        isNative: true 
    },

    "WETH": { 
        address: "0x4200000000000000000000000000000000000006", 
        decimals: 18, 
        isNative: false 
    },
    
    "USDC": { 
        address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", 
        decimals: 6,  
        isNative: false 
    },
};

export const AAVE_V3_BASE_SEPOLIA = {
    POOL: "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b", 
    
    ASSETS: {
        "WETH": { 
            address: KNOWN_TOKENS["WETH"]!.address, 
            decimals: KNOWN_TOKENS["WETH"]!.decimals 
        },
        "USDC": { 
            address: KNOWN_TOKENS["USDC"]!.address, 
            decimals: KNOWN_TOKENS["USDC"]!.decimals 
        },
    }
};