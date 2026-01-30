export type ExecutionContext = Record<string, any>;

export const resolveVariable = (input: any, context: ExecutionContext): any => {
    // 1. If it's not a string (e.g. already a number), return as is
    if (typeof input !== "string") return input;

    // 2. CHECK FOR EXACT MATCH (Preserves Types)
    // If the input is EXACTLY "{{Variable}}", return the raw value (e.g. a Number)
    // This ensures that Math nodes receive 100 instead of "100"
    const exactMatch = input.match(/^\{\{(.+?)\}\}$/);
    if (exactMatch) {
        const variableName = exactMatch[1] || "";
        if (variableName in context) {
            return context[variableName];
        }
        console.warn(`⚠️ Variable {{${variableName}}} not found in context.`);
        return null; 
    }

    // 3. STRING INTERPOLATION (For Sentences/Discord)
    // If we are here, the string contains text mixed with variables.
    // We use .replace() with the Global flag /g to swap ALL variables.
    return input.replace(/\{\{(.+?)\}\}/g, (fullMatch, variableName) => {
        if (variableName in context) {
            return context[variableName];
        } else {
            console.warn(`⚠️ Variable {{${variableName}}} not found in context.`);
            // Return the original {{Var}} so the user sees the error in the text
            return fullMatch;
        }
    });
};