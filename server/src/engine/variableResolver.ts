export type ExecutionContext = Record<string, any>;

/**
 * Helper to resolve a deep path in an object 
 * Example: "node_1.TX_HASH" -> context["node_1"]["TX_HASH"]
 */
const getDeepValue = (path: string, context: ExecutionContext): any => {
    // Split by dot and trim whitespace (handles {{ node_1.TX_HASH }} spaces)
    const parts = path.split('.').map(p => p.trim());
    
    let current = context;

    for (const part of parts) {
        // Traverse only if current is a valid object and has the key
        if (current && typeof current === 'object' && part in current) {
            current = current[part];
        } else {
            // Path not found
            return undefined;
        }
    }
    return current;
};

export const resolveVariable = (input: any, context: ExecutionContext): any => {
    // 1. If input is not a string (e.g. number 100, boolean true), return it directly.
    if (typeof input !== "string") return input;

    // 2. CHECK FOR EXACT MATCH (Preserves Types)
    // If the input is EXACTLY "{{Variable}}", return the raw value (number, object, etc).
    // This allows Math nodes to receive actual numbers.
    const exactMatch = input.match(/^\{\{(.+?)\}\}$/);
    
    if (exactMatch) {
        const path = exactMatch[1] || "";
        const value = getDeepValue(path, context);

        if (value !== undefined) {
            return value;
        }

        console.warn(`⚠️ Variable {{${path}}} not found in context.`);
        return null; // Return null so logic nodes know it failed
    }

    // 3. STRING INTERPOLATION (For Discord/Email Messages)
    // "Balance is {{node_1.balance}}" -> "Balance is 500"
    return input.replace(/\{\{(.+?)\}\}/g, (fullMatch, path) => {
        const value = getDeepValue(path, context);

        if (value !== undefined) {
            // If the resolved value is an object/array, stringify it for display
            return typeof value === 'object' ? JSON.stringify(value) : String(value);
        } else {
            console.warn(`⚠️ Variable {{${path}}} not found in context.`);
            // Return original {{path}} so user sees the unresolved variable in the text
            return fullMatch;
        }
    });
};