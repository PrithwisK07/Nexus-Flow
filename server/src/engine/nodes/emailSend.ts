import nodemailer from "nodemailer";
import { resolveVariable, type ExecutionContext } from "../variableResolver.js";

type ActionInput = Record<string, any>;

export const sendEmail = async (inputs: ActionInput, context: ExecutionContext) => {
    const to = resolveVariable(inputs.to, context);
    const subject = resolveVariable(inputs.subject, context);
    const body = resolveVariable(inputs.body, context);
    
    const smtpConfig = {
        host: inputs.smtpHost || "smtp.gmail.com",
        port: inputs.smtpPort || 587,
        secure: false, 
        auth: {
            user: inputs.smtpUser, 
            pass: inputs.smtpPass  
        }
    };
    
    console.log(`   📧 Executing Email Node: Sending to ${to}...`);

    const transporter = nodemailer.createTransport(smtpConfig);

    const info = await transporter.sendMail({
        from: `"Nexus Flow" <${smtpConfig.auth.user}>`,
        to: to,
        subject: subject,
        text: body, 
        html: body.replace(/\n/g, "<br>") 
    });

    console.log(`      -> Email sent: ${info.messageId}`);
    return { "EMAIL_ID": info.messageId };
};