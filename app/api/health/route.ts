// Agar Supabase tetap tercatat aktif
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";

export async function GET() {
  try {
    const { error } = await supabaseAdmin
      .from("secrets")
      .select("id")
      .limit(1);

    if (error) throw error;

    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
