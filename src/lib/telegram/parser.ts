import Anthropic from "@anthropic-ai/sdk";

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

const client = new Anthropic();

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

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    system,
    tools: [
      {
        name: "log_transaction",
        description: "Log a single personal-finance transaction parsed from a natural-language message.",
        input_schema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["EXPENSE", "CREDIT"] },
            amount: { type: "number", description: "Total amount in INR (positive)." },
            categoryName: { type: "string", enum: allCats },
            merchant: { type: "string", description: "Merchant or source (Swiggy, HDFC Rent, etc.). Optional." },
            note: { type: "string", description: "Short free-text note. Optional." },
            occurredAt: { type: "string", description: "YYYY-MM-DD date the transaction happened." },
            isRecurring: { type: "boolean" },
            myShare: { type: "number", description: "User's portion for split expenses, in INR." },
            splitWith: { type: "string", description: "Comma-separated friend names, if split." },
            confidence: { type: "number", description: "0.0–1.0 confidence in this parse." },
          },
          required: ["type", "amount", "categoryName", "occurredAt", "confidence"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "log_transaction" },
    messages: [{ role: "user", content: `Today: ${todayIso}. Message: ${text}` }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return null;
  return toolUse.input as ParsedTxn;
}
