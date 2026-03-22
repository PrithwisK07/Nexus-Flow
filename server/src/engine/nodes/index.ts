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
import { httpReq } from "./httpReq.js";
import { extractJson } from "./jsonExtractor.js";
import { mergeNode } from "./mergeNodes.js";
import { formatDate } from "./formatData.js";
import { dataTransformer } from "./dataTransformer.js";
import { readRSS } from "./rssReader.js";
import { getAaveSupply } from "./aaveSupply.js";
import { httpScraper } from "./httpScraper.js";
import { walletBalance } from "./walletBalance.js";
import { geminiPrompt } from "./geminiPrompt.js";
import { aiSummarizer } from "./aiSummarizer.js";
import { aiSentiment } from "./aiSentiment.js";
import { getMemory } from "./getMemory.js";
import { setMemory } from "./setMemory.js";
import { currentTime } from "./currentTime.js";
import { aiDecision } from "./aiDecisions.js";
import { switchRouter } from "./switchRouter.js";

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
    "http_request": httpReq,
    "json_extract": extractJson,
    "merge": mergeNode,
    "format_date": formatDate,
    "transform_data": dataTransformer,
    "read_rss": readRSS,
    "aave_supply": getAaveSupply,
    "http_scraper": httpScraper,
    "wallet_balance": walletBalance,
    "gemini_prompt": geminiPrompt,
    "ai_summarizer": aiSummarizer,
    "ai_sentiment": aiSentiment,
    "set_memory": setMemory,
    "get_memory": getMemory,
    "current_time": currentTime,
    "ai_decision": aiDecision,
    "switch_router": switchRouter
};
