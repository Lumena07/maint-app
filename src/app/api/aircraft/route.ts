import { NextRequest, NextResponse } from 'next/server';
import { readCache } from '@/lib/kv';

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/aircraft - Fetching aircraft list from blob');
    
    // Read aircraft data from blob
    const data = await readCache();
    if (!data) {
      console.error('GET /api/aircraft - No data found in blob');
      return NextResponse.json({ error: 'No aircraft data available' }, { status: 500 });
    }

    const aircraft = data.aircraft || [];
    console.log(`GET /api/aircraft - Returning ${aircraft.length} aircraft from blob`);
    
    if (aircraft.length > 0) {
      console.log('GET /api/aircraft - First aircraft:', {
        id: aircraft[0].id,
        registration: aircraft[0].registration,
        status: aircraft[0].status,
        isGrounded: aircraft[0].groundingStatus?.isGrounded,
        currentRecordId: aircraft[0].groundingStatus?.currentRecord?.id,
        estimatedUngroundingDate: aircraft[0].groundingStatus?.currentRecord?.estimatedUngroundingDate
      });
    }

    return NextResponse.json(aircraft);
  } catch (error) {
    console.error('GET /api/aircraft - Error:', error);
    return NextResponse.json({ error: 'Failed to fetch aircraft data' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Implementation for updating individual aircraft
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
} 