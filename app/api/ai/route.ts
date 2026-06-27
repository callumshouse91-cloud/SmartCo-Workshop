import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ text: "", error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }
  try {
    const { system, content } = await req.json();
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        // If your account uses a different model string, change it here.
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content }],
      }),
    });
    const d = await r.json();
    const text = (d.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ text: "", error: String(e) }, { status: 500 });
  }
}
