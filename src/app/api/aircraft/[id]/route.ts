import { NextRequest, NextResponse } from "next/server";
import { Aircraft } from "@/lib/types";
import { readCache } from '@/lib/kv';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    console.log(`GET /api/aircraft/${id} - Fetching aircraft from blob`);
    
    // Read aircraft data from blob
    const data = await readCache();
    if (!data) {
      console.error('GET /api/aircraft/[id] - No data found in blob');
      return NextResponse.json({ error: "Aircraft data not available" }, { status: 500 });
    }

    const aircraft = data.aircraft?.find((ac: Aircraft) => ac.id === id);
    
    if (!aircraft) {
      console.log(`GET /api/aircraft/${id} - Aircraft not found`);
      return NextResponse.json({ error: "Aircraft not found" }, { status: 404 });
    }

    console.log(`GET /api/aircraft/${id} - Found aircraft:`, {
      id: aircraft.id,
      registration: aircraft.registration,
      status: aircraft.status,
      isGrounded: aircraft.groundingStatus?.isGrounded
    });
    
    return NextResponse.json(aircraft);
  } catch (error) {
    console.error(`GET /api/aircraft/${id} - Error:`, error);
    return NextResponse.json({ error: "Failed to fetch aircraft" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Implementation for updating individual aircraft
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
