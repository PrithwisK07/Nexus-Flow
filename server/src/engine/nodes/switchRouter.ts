import { resolveVariable, type ExecutionContext } from "../variableResolver.js";

type ActionInput = Record<string, any>;

export const switchRouter = async (inputs: ActionInput, context: ExecutionContext) => {
    const rawValue = resolveVariable(inputs.value, context);
    const actualValue = String(rawValue || "").trim();
    
    const rawRoutes = resolveVariable(inputs.routes, context) || "";
    const routes = rawRoutes.split(',').map((r: string) => r.trim());

    console.log(`   🔀 Switch Router: Evaluating "${actualValue}"...`);

    let matchedRoute = "default";

    // Try to find a case-insensitive match
    const lowerRoutes = routes.map((r: string) => r.toLowerCase());
    const index = lowerRoutes.indexOf(actualValue.toLowerCase());
    
    if (index >= 0) {
        matchedRoute = routes[index]; // Use original casing to match the routeMap
    }

    console.log(`      -> Routing to: [${matchedRoute}]`);

    return {
        "MATCHED_ROUTE": matchedRoute,
        "STATUS": "Success"
    };
};