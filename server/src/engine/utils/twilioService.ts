import twilio from 'twilio';

export const dispatchVoiceAlert = async (workflowId: string, alertMessage: string) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;
    const toPhone = process.env.USER_PHONE_NUMBER; 

    if (!accountSid || !authToken || !fromPhone || !toPhone) {
        console.warn("   ⚠️ Twilio credentials missing. Skipping automated phone call.");
        return;
    }

    const client = twilio(accountSid, authToken);

    // TwiML tells Twilio what to say when the user picks up the phone.
    // We use the "Polly.Matthew" voice for a professional, robotic AI assistant sound.
    const twiml = `
        <Response>
            <Say voice="Polly.Matthew">
                Hello. This is an urgent alert from your Nexus Flow Autonomous Agent. 
                Your workflow has been paused. 
                ${alertMessage}
                Please log into your dashboard to resolve this issue and resume the workflow. 
                Goodbye.
            </Say>
        </Response>
    `;

    try {
        console.log(`   📞 Dispatching Automated Call to ${toPhone}...`);
        await client.calls.create({
            twiml: twiml,
            to: toPhone,
            from: fromPhone
        });
        console.log(`   ✅ Call successfully dispatched!`);
    } catch (error: any) {
        console.error("   ❌ Failed to dispatch Twilio call:", error.message);
    }
};