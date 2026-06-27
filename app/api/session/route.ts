import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") || "current";
  if (!supabaseAdmin) return NextResponse.json({ data: null, error: "Supabase not configured" });
  const { data, error } = await supabaseAdmin.from("sessions").select("data").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  return NextResponse.json({ data: data?.data ?? null });
}

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
  const { id = "current", data } = await req.json();
  const { error } = await supabaseAdmin
    .from("sessions")
    .upsert({ id, data, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
