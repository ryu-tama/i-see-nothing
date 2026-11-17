import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/src/lib/supabaseAdmin";
import { unstable_noStore as noStore } from 'next/cache';

export async function GET() {
  noStore();
  try {
    const { error } = await supabaseAdmin
      .from("secrets")
      .select("id")
      .limit(1);

    if (error) throw error;

    return NextResponse.json({ 
      status: "ok", 
      timestamp: new Date().toISOString() 
    });
  } catch (err) {
    console.error("Health check failed:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
