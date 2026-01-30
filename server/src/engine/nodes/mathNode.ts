import { resolveVariable, type ExecutionContext } from "../variableResolver.js";

type ActionInput = Record<string, any>;

export const executeMath = async (inputs: ActionInput, context: ExecutionContext) => {
    const a = Number(resolveVariable(inputs.valueA, context));
    const b = Number(resolveVariable(inputs.valueB, context));
    const op = inputs.operation; 

    console.log(`   wm Executing Math Node: ${a} ${op} ${b}`);

    let result = 0;
    switch (op) {
        case "add": result = a + b; break;
        case "subtract": result = a - b; break;
        case "multiply": result = a * b; break;
        case "divide": result = a / b; break;
        case "percent": result = a * (b / 100); break; 
        default: throw new Error(`Unknown math operation: ${op}`);
    }

    console.log(`      -> Result is ${result}`);

    return { "MATH_RESULT": result };
};