// Simple formula evaluator for custom field formulas
// Supports: arithmetic (+, -, *, /), field references ({fieldName}), and basic functions

type FieldValues = Record<string, number | string | null>;

export function evaluateFormula(
  expression: string,
  fieldValues: FieldValues
): number | string | null {
  try {
    // Replace field references with their values
    let resolved = expression.replace(
      /\{(\w+)\}/g,
      (_match, fieldName: string) => {
        const value = fieldValues[fieldName];
        if (value === null || value === undefined) return "0";
        return String(value);
      }
    );

    // Support basic functions
    resolved = resolved.replace(
      /SUM\(([^)]+)\)/gi,
      (_match, args: string) => {
        const nums = args.split(",").map((s) => parseFloat(s.trim()) || 0);
        return String(nums.reduce((a, b) => a + b, 0));
      }
    );

    resolved = resolved.replace(
      /AVG\(([^)]+)\)/gi,
      (_match, args: string) => {
        const nums = args.split(",").map((s) => parseFloat(s.trim()) || 0);
        return String(nums.reduce((a, b) => a + b, 0) / nums.length);
      }
    );

    resolved = resolved.replace(
      /MIN\(([^)]+)\)/gi,
      (_match, args: string) => {
        const nums = args.split(",").map((s) => parseFloat(s.trim()) || 0);
        return String(Math.min(...nums));
      }
    );

    resolved = resolved.replace(
      /MAX\(([^)]+)\)/gi,
      (_match, args: string) => {
        const nums = args.split(",").map((s) => parseFloat(s.trim()) || 0);
        return String(Math.max(...nums));
      }
    );

    // Evaluate arithmetic expression safely
    return safeEval(resolved);
  } catch {
    return null;
  }
}

function safeEval(expr: string): number {
  // Only allow numbers, operators, parentheses, spaces, and decimal points
  const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, "");
  if (!sanitized.trim()) return 0;

  // Use Function constructor for safe arithmetic evaluation
  const fn = new Function(`"use strict"; return (${sanitized});`);
  const result = fn();

  if (typeof result !== "number" || !isFinite(result)) return 0;
  return Math.round(result * 100) / 100;
}

export function evaluateRollup(
  aggregation: "SUM" | "COUNT" | "AVG" | "MIN" | "MAX",
  values: number[]
): number {
  if (values.length === 0) return 0;

  switch (aggregation) {
    case "SUM":
      return values.reduce((a, b) => a + b, 0);
    case "COUNT":
      return values.length;
    case "AVG":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "MIN":
      return Math.min(...values);
    case "MAX":
      return Math.max(...values);
    default:
      return 0;
  }
}
