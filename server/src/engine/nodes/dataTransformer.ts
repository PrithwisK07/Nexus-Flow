import { resolveVariable, type ExecutionContext } from "../variableResolver.js";

type ActionInput = Record<string, any>;

export const dataTransformer = async (inputs: ActionInput, context: ExecutionContext) => {
    const input = resolveVariable(inputs.value, context);
    const operation = inputs.operation; 

    console.log(`   🛠️ Executing Transformer: ${operation} on "${input}"`);

    let result: any = input;

    switch (operation) {
        case "upper":
            result = String(input).toUpperCase();
            break;
        case "lower":
            result = String(input).toLowerCase();
            break;
        case "replace":
            const search = inputs.param || "";
            const replaceValue = inputs.replaceValue || "";
            result = String(input).split(search).join(replaceValue); 
            break;
        case "parse_number":
            result = String(input).replace(/[^0-9.]/g, "");
            break;
        default:
            throw new Error(`Unknown Transform Operation: ${operation}`);
    }

    return { "TRANSFORMED_RESULT": result };
};