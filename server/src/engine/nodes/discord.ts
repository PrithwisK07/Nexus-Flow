import { resolve } from "node:dns";
import { resolveVariable, type ExecutionContext } from "../variableResolver.js"

type ActionInput = Record<string, any>;

export const discordNotify = async (inputs: ActionInput, context: ExecutionContext) => {
    const url = resolveVariable(inputs.webhookUrl, context);
    const message = resolveVariable(inputs.messageSent, context);

    console.log(`   🔔 Executing Discord Node: Sending message...`);

    if (!url || !url.startsWith("https://discord.com")) {
        throw new Error("Invalid Discord Webhook URL");
    }

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            content: message,
            username: "Nexus Flow Bot"
        }),
    });

    if (!response.ok) {
        throw new Error(`Discord API Error: ${response.statusText}`);
    }

    console.log(`      -> Message sent!`);
    return { "DISCORD_STATUS": "Sent" };
}; 