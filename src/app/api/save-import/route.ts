import { NextRequest, NextResponse } from "next/server";
import { writeCache } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const success = await writeCache(body);
    
    if (success) {
      return NextResponse.json({ ok: true });
    } else {
      return NextResponse.json({ ok: false, error: "Failed to save to Blob" }, { status: 500 });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}


