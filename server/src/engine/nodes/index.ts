import { getGasPrice } from "./getGasPrice.js";
import { getPriceCoinGecko } from "./getPrice.js";
import { transfer } from "./transfer.js";
import { updateRow } from "./update_row.js";
import { executeMath } from "./mathNode.js";
import { discordNotify } from "./discord.js";
import { readContract } from "./readContract.js";
import { swapUniswap } from "./swapUniswap.js";
import { writeContract } from "./writeContract.js";
import { telegramNotify } from "./telegramNotify.js";
import { sendEmail } from "./emailSend.js";
import { resolveENS } from "./resolveENS.js";

export const NODE_REGISTRY: Record<string, Function> = {
    "transfer": transfer,    
    "update_row": updateRow,
    "get_price": getPriceCoinGecko,
    "get_gas_price": getGasPrice,
    "math_operation": executeMath,
    "discord_notify": discordNotify,
    "read_contract": readContract,
    "swap_uniswap": swapUniswap,
    "write_contract": writeContract,
    "telegram_notify": telegramNotify,
    "email_send": sendEmail,
    "resolve_ens": resolveENS,
};
