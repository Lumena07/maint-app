import { NextRequest, NextResponse } from "next/server";
import { Aircraft } from "@/lib/types";
import { readCache, writeCache } from "@/lib/kv";

export async function POST(request: NextRequest) {
  try {
    const { aircraftId, updates } = await request.json();
    
    // Read the current cache data
    const cacheData = await readCache();
    if (!cacheData) {
      return NextResponse.json({ error: "Cache not available" }, { status: 500 });
    }
    
    // Find and update the aircraft
    const aircraftIndex = cacheData.aircraft.findIndex((ac: Aircraft) => ac.id === aircraftId);
    
    if (aircraftIndex === -1) {
      return NextResponse.json({ error: "Aircraft not found" }, { status: 404 });
    }
    
    // Update the aircraft with new data
    cacheData.aircraft[aircraftIndex] = {
      ...cacheData.aircraft[aircraftIndex],
      ...updates
    };
    
    // Write the updated data back to the blob
    const success = await writeCache(cacheData);
    if (!success) {
      return NextResponse.json({ error: "Failed to save updated data" }, { status: 500 });
    }
    
    return NextResponse.json(cacheData.aircraft[aircraftIndex]);
  } catch (error) {
    console.error("Error updating cache:", error);
    return NextResponse.json({ error: "Failed to update cache" }, { status: 500 });
  }
}
