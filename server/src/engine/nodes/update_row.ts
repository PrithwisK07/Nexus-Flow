import { resolveVariable, type ExecutionContext } from "../variableResolver.js";
import { updateCell } from "../sheetWatcher.js";

type ActionInput = Record<string, any>;

export const updateRow = async (inputs: ActionInput, context: ExecutionContext) => {
    const val = resolveVariable(inputs.value, context);
    const colIdx = inputs.colIndex;
    const rowIndex = context["ROW_INDEX"];
    
    if (!val) {
        console.log("   ⚠️ No value to write (maybe TX failed?). Skipping update.");
        return { "STATUS": "Failed" }; 
    }

    const colLetter = String.fromCharCode(65 + colIdx);
    await updateCell(
        inputs.spreadsheetId, 
        `Sheet1!${colLetter}${rowIndex}`, 
        val
    );

    console.log(`   📝 Updated Sheet Cell ${colLetter}${rowIndex}: ${val}`);
}