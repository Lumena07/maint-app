import { NextResponse } from "next/server";
import { migrateToBlob } from "@/lib/migrate-to-kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const success = await migrateToBlob();
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: "Data successfully migrated to Vercel Blob" 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: "Migration failed" 
      }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
