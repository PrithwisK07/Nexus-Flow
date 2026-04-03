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

    "DAI":  { 
        address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", 
        decimals: 18, 
        isNative: false 
    },

    "LINK": { 
        address: "0xE4aB69C077896252FAFBD49EFD26B5D171A32410", 
        decimals: 18, 
        isNative: false 
    },

    "UNI":  { 
        address: "0x8a914Bdb492F0eCEca7461C4CbfDbd76Bf1ba9a3", 
        decimals: 18, 
        isNative: false 
    },

    "PEPE": { 
        // Note: Using a placeholder address since official PEPE isn't natively deployed on Base Sepolia
        address: "0x3456789012345678901234567890123456789012", 
        decimals: 18, 
        isNative: false 
    }
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
        "DAI": { 
            address: KNOWN_TOKENS["DAI"]!.address, 
            decimals: KNOWN_TOKENS["DAI"]!.decimals 
        },
        "LINK": { 
            address: KNOWN_TOKENS["LINK"]!.address, 
            decimals: KNOWN_TOKENS["LINK"]!.decimals 
        }
    }
};