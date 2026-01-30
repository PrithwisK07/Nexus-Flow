import { type ExecutionContext, resolveVariable } from "../variableResolver.js";

type ActionInput = Record<string, any>;

export const telegramNotify = async (inputs: ActionInput, context: ExecutionContext) => {
    const botToken = resolveVariable(inputs.botToken, context);
    const chatId = resolveVariable(inputs.chatId, context);
    const message = resolveVariable(inputs.message, context);

    console.log(`   ✈️ Executing Telegram Node: Sending to ${chatId}...`);

    if (!botToken || !chatId) throw new Error("Missing Telegram Token or Chat ID");
    
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "Markdown"
        })
    });

    const data = await response.json();
    if (!data.ok) {
        throw new Error(`Telegram API Error: ${data.description}`);
    }

    console.log(`      -> Telegram sent!`);
    return { "TELEGRAM_STATUS": "Sent" };
};