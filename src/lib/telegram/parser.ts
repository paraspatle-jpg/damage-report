import { FunctionCallingConfigMode, GoogleGenAI, Type } from "@google/genai";

export type ParsedTxn = {
  type: "EXPENSE" | "CREDIT";
  amount: number;
  categoryName: string;
  merchant?: string;
  note?: string;
  occurredAt: string;
  isRecurring?: boolean;
  myShare?: number;
  splitWith?: string;
  confidence: number;
};

type CategoryHint = { name: string; type: string };

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export async function parseExpenseMessage(
  text: string,
  categories: CategoryHint[],
): Promise<ParsedTxn | null> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const expenseCats = categories.filter((c) => c.type !== "INCOME").map((c) => c.name);
  const incomeCats = categories.filter((c) => c.type === "INCOME").map((c) => c.name);
  const allCats = categories.map((c) => c.name);

  const system = `You parse personal-finance messages from a retail investor in India. All amounts are INR (₹). Always call the log_transaction tool with exactly one transaction.

Rules:
- type=EXPENSE for money leaving the user. type=CREDIT for money arriving (salary, interest, dividend, freelance, reimbursement).
- For EXPENSE, categoryName MUST be one of: ${expenseCats.join(", ")}.
- For CREDIT, categoryName MUST be one of: ${incomeCats.join(", ")}.
- Shared expenses: if the text mentions splitting with friends (names, "with X Y Z", "split", "shared"), set splitWith=comma-separated names and myShare=the user's own portion. Prefer an explicit "my share N" from the text. Otherwise divide amount by (number of names + 1) for an even split. Do NOT set myShare for solo transactions.
- occurredAt: YYYY-MM-DD. Default to today (${todayIso}). "Yesterday" → previous day. Convert any relative phrase to a concrete date.
- isRecurring=true for clear subscription/monthly patterns (netflix, spotify, rent, emi, "monthly", "subscription").
- confidence ∈ [0,1]: how sure you are. Drop below 0.5 if the amount, category, or intent is genuinely unclear.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: `Today: ${todayIso}. Message: ${text}` }] }],
    config: {
      systemInstruction: system,
      maxOutputTokens: 512,
      tools: [
        {
          functionDeclarations: [
            {
              name: "log_transaction",
              description: "Log a single personal-finance transaction parsed from a natural-language message.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["EXPENSE", "CREDIT"] },
                  amount: { type: Type.NUMBER, description: "Total amount in INR (positive)." },
                  categoryName: { type: Type.STRING, enum: allCats },
                  merchant: { type: Type.STRING, description: "Merchant or source (Swiggy, HDFC Rent, etc.). Optional." },
                  note: { type: Type.STRING, description: "Short free-text note. Optional." },
                  occurredAt: { type: Type.STRING, description: "YYYY-MM-DD date the transaction happened." },
                  isRecurring: { type: Type.BOOLEAN },
                  myShare: { type: Type.NUMBER, description: "User's portion for split expenses, in INR." },
                  splitWith: { type: Type.STRING, description: "Comma-separated friend names, if split." },
                  confidence: { type: Type.NUMBER, description: "0.0–1.0 confidence in this parse." },
                },
                required: ["type", "amount", "categoryName", "occurredAt", "confidence"],
              },
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY,
          allowedFunctionNames: ["log_transaction"],
        },
      },
    },
  });

  const call = response.functionCalls?.[0];
  if (!call || call.name !== "log_transaction" || !call.args) return null;
  return call.args as unknown as ParsedTxn;
}
