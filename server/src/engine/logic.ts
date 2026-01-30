// 1. Define the Types
export type Operator = 
    | ">" | "<" | "==" | "!=" | ">=" | "<=" 
    | "contains" | "not_contains" 
    | "starts_with" | "ends_with" 
    | "is_empty" | "is_not_empty"
    | "matches_regex";

export type LogicRule = {
    valueA: any;
    operator: Operator;
    valueB?: any; 
};

export type RuleGroup = {
    combinator: "AND" | "OR";
    rules: (LogicRule | RuleGroup)[]; 
};

export const evaluateSingle = (rule: LogicRule): boolean => {
    let { valueA, operator, valueB } = rule;
    
    if (!isNaN(Number(valueA)) && !isNaN(Number(valueB))) {
        valueA = Number(valueA);
        valueB = Number(valueB);
    }

    switch (operator) {
        // Mathematical ops.
        case ">": return valueA > valueB;
        case "<": return valueA < valueB;
        case ">=": return valueA >= valueB;
        case "<=": return valueA <= valueB;
        case "==": return valueA == valueB;
        case "!=": return valueA != valueB;

        // String / Array ops
        case "contains": return String(valueA).includes(String(valueB));
        case "not_contains": return !String(valueA).includes(String(valueB));
        case "starts_with": return String(valueA).startsWith(String(valueB));
        case "ends_with": return String(valueA).endsWith(String(valueB));
        
        case "is_empty": return valueA === null || valueA === "" || valueA === undefined;
        case "is_not_empty": return valueA !== null && valueA !== "" && valueA !== undefined;

        // Regex.
        case "matches_regex": return new RegExp(valueB).test(String(valueA));

        default: return false;
    }
};

export const evaluateRuleGroup = (group: RuleGroup): boolean => {
    if (group.rules.length === 0) return true;

    const results = group.rules.map((item) => {
        if ("combinator" in item) {
            return evaluateRuleGroup(item as RuleGroup);
        }
        return evaluateSingle(item as LogicRule);
    });

    if (group.combinator === "AND") {
        return results.every((r) => r === true); // All must be true
    } else {
        return results.some((r) => r === true); // At least one must be true
    }
};