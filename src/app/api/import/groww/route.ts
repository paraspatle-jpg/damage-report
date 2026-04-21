import { NextResponse } from "next/server";
import { parseGrowwCsv } from "@/lib/import/groww";
import { withAuth } from "@/lib/auth/guards";

const MAX_BYTES = 2_000_000;

export const POST = withAuth(async (req) => {
  const contentType = req.headers.get("content-type") ?? "";
  let csv = "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "File too large (max 2MB)." }, { status: 413 });
      }
      csv = await file.text();
    } else {
      const body = await req.json();
      csv = typeof body?.csv === "string" ? body.csv : "";
    }
  } catch {
    return NextResponse.json({ error: "Could not read upload." }, { status: 400 });
  }

  if (!csv.trim()) {
    return NextResponse.json({ error: "Empty CSV." }, { status: 400 });
  }

  const parsed = parseGrowwCsv(csv);
  if (parsed.rows.length === 0) {
    return NextResponse.json(
      {
        error:
          "Could not detect any holding rows. Make sure you uploaded the Groww Stocks holdings CSV with columns like Stock Name, Quantity, Average Price.",
      },
      { status: 422 },
    );
  }

  return NextResponse.json(parsed);
});
