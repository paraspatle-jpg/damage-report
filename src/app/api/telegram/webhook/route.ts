import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseExpenseMessage } from "@/lib/telegram/parser";
import { sendTelegramMessage } from "@/lib/telegram/reply";
import { verifyApiKey } from "@/lib/auth/api-key";

export const dynamic = "force-dynamic";

const UNDO_WINDOW_MS = 5 * 60_000;

function inr(v: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(v));
}

const HELP = [
  "InvestOS expense bot",
  "",
  "Log transactions in plain English:",
  '  • "450 swiggy dinner"',
  '  • "dinner with rohan priya 2000 my share 500"',
  '  • "salary 120000"',
  '  • "netflix 499 monthly"',
  "",
  'Reply "undo" within 5 min to remove the last entry.',
].join("\n");

export async function POST(req: Request) {
  // Telegram sends the configured secret_token back on every call.
  // We use it as the API-key transport, verified against the ApiKey table.
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!secret || !(await verifyApiKey(secret))) {
    return new Response("forbidden", { status: 403 });
  }

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  const text: string | undefined = msg?.text;
  const chatId = msg?.chat?.id;
  if (!msg || !text || chatId == null) return NextResponse.json({ ok: true });

  const allowed = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!allowed || String(chatId) !== allowed) {
    return NextResponse.json({ ok: true });
  }

  const trimmed = text.trim();

  if (trimmed === "/start" || trimmed === "/help") {
    await sendTelegramMessage(chatId, HELP);
    return NextResponse.json({ ok: true });
  }

  if (/^(undo|cancel|no)$/i.test(trimmed)) {
    const recent = await prisma.transaction.findFirst({
      where: {
        source: "telegram",
        createdAt: { gte: new Date(Date.now() - UNDO_WINDOW_MS) },
      },
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });
    if (!recent) {
      await sendTelegramMessage(chatId, "Nothing to undo in the last 5 minutes.");
    } else {
      await prisma.transaction.delete({ where: { id: recent.id } });
      const label = [inr(recent.amount), recent.category.name, recent.merchant]
        .filter(Boolean)
        .join(" · ");
      await sendTelegramMessage(chatId, `↶ Removed ${label}`);
    }
    return NextResponse.json({ ok: true });
  }

  try {
    const categories = await prisma.category.findMany();
    const parsed = await parseExpenseMessage(
      trimmed,
      categories.map((c) => ({ name: c.name, type: c.type })),
    );

    if (!parsed) {
      await sendTelegramMessage(chatId, "Couldn't parse that. Try: \"450 swiggy\" or \"salary 120000\".");
      return NextResponse.json({ ok: true });
    }
    if (parsed.confidence < 0.55) {
      await sendTelegramMessage(
        chatId,
        `Not sure how to log: "${trimmed}". Try including an amount and category (food, rent, salary, etc.).`,
      );
      return NextResponse.json({ ok: true });
    }

    const category = categories.find((c) => c.name === parsed.categoryName);
    if (!category) {
      await sendTelegramMessage(
        chatId,
        `Unknown category "${parsed.categoryName}". Add it via the web UI or rephrase.`,
      );
      return NextResponse.json({ ok: true });
    }

    if (parsed.type === "EXPENSE" && category.type === "INCOME") {
      await sendTelegramMessage(chatId, `"${category.name}" is an income category but you sent an expense. Rephrase?`);
      return NextResponse.json({ ok: true });
    }
    if (parsed.type === "CREDIT" && category.type !== "INCOME") {
      await sendTelegramMessage(chatId, `"${category.name}" isn't an income category. Rephrase?`);
      return NextResponse.json({ ok: true });
    }

    const occurredAt = new Date(parsed.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      await sendTelegramMessage(chatId, "Invalid date in parse. Try again.");
      return NextResponse.json({ ok: true });
    }

    let myShare = parsed.myShare;
    if (myShare != null && myShare > parsed.amount) myShare = parsed.amount;
    if (myShare != null && myShare === parsed.amount) myShare = undefined;

    await prisma.transaction.create({
      data: {
        type: parsed.type,
        amount: parsed.amount,
        categoryId: category.id,
        merchant: parsed.merchant,
        note: parsed.note,
        occurredAt,
        source: "telegram",
        rawText: trimmed,
        isRecurring: parsed.isRecurring ?? false,
        myShare,
        splitWith: parsed.splitWith,
      },
    });

    const sign = parsed.type === "EXPENSE" ? "−" : "+";
    const displayAmt = myShare ?? parsed.amount;
    const header = [
      `✅ ${sign}${inr(displayAmt)}`,
      category.name,
      parsed.merchant,
    ]
      .filter(Boolean)
      .join(" · ");
    const lines = [header];
    if (myShare != null) {
      const owed = parsed.amount - myShare;
      lines.push(
        `    you paid ${inr(parsed.amount)}, ${inr(owed)} owed to you${
          parsed.splitWith ? ` by ${parsed.splitWith}` : ""
        }`,
      );
    }
    if (parsed.isRecurring) lines.push("    marked recurring");
    lines.push('Reply "undo" to remove.');
    await sendTelegramMessage(chatId, lines.join("\n"));
  } catch (e) {
    console.error("telegram webhook error", e);
    await sendTelegramMessage(
      chatId,
      `Error logging that. ${e instanceof Error ? e.message : "Try again."}`,
    );
  }

  return NextResponse.json({ ok: true });
}
