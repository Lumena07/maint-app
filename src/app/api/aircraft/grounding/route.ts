import { NextRequest, NextResponse } from 'next/server';
import { Aircraft, GroundingRecord, GroundingStatus } from '@/lib/types';
import { readCache as readBlobCache, writeCache as writeBlobCache } from '@/lib/kv';

const calculateDaysOnGround = (groundingDate: string, ungroundingDate?: string): number => {
  const start = new Date(groundingDate);
  const end = ungroundingDate ? new Date(ungroundingDate) : new Date();
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const readCache = async (): Promise<any> => {
  try {
    const data = await readBlobCache();
    if (!data) {
      return { aircraft: [], groundingRecords: [] };
    }
    return data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return { aircraft: [] };
  }
};

const writeCache = async (data: any): Promise<boolean> => {
  try {
    return await writeBlobCache(data);
  } catch (error) {
    console.error('Error writing cache:', error);
    return false;
  }
};

export async function POST(request: NextRequest) {
  console.log("Grounding API called with method:", request.method);
  console.log("Request URL:", request.url);
  try {
    const requestBody = await request.clone().json();
    console.log("Request body:", requestBody);
    console.log("Request body:", await request.clone().json());
    const body = await request.json();
    const { aircraftId, action, record, recordId } = body;

    if (!aircraftId) {
      return NextResponse.json({ error: 'Aircraft ID is required' }, { status: 400 });
    }

    const cache = await readCache();
    console.log('Grounding API - Cache loaded:', { 
      aircraftCount: cache.aircraft?.length || 0,
      hasGroundingRecords: !!cache.groundingRecords,
      groundingRecordsCount: cache.groundingRecords?.length || 0
    });
    
    const aircraftIndex = cache.aircraft.findIndex((a: Aircraft) => a.id === aircraftId);

    if (aircraftIndex === -1) {
      console.log('Grounding API - Aircraft not found:', aircraftId);
      return NextResponse.json({ error: 'Aircraft not found' }, { status: 404 });
    }

    const aircraft = cache.aircraft[aircraftIndex];
    console.log('Grounding API - Aircraft found:', { 
      id: aircraft.id, 
      name: aircraft.name,
      hasGroundingStatus: !!aircraft.groundingStatus,
      isGrounded: aircraft.groundingStatus?.isGrounded
    });

    if (action === 'ground') {
      if (!record) {
        return NextResponse.json({ error: 'Grounding record is required' }, { status: 400 });
      }

      // Create new grounding record
      const newRecord: GroundingRecord = {
        id: generateId(),
        aircraftId,
        isGrounded: true,
        groundingDate: record.groundingDate || new Date().toISOString().split('T')[0],
        reason: record.reason,
        description: record.description,
        planOfAction: record.planOfAction,
        sparePartsRequired: record.sparePartsRequired || false,
        spareStatus: record.spareStatus || 'Not Required',
        spareOrderDate: record.spareOrderDate,
        spareExpectedDate: record.spareExpectedDate,
        estimatedUngroundingDate: record.estimatedUngroundingDate,
        daysOnGround: 0,
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Update aircraft grounding status
      const groundingStatus: GroundingStatus = {
        isGrounded: true,
        currentRecord: newRecord,
        totalDaysGrounded: (aircraft.groundingStatus?.totalDaysGrounded || 0),
        lastGroundedDate: newRecord.groundingDate,
        lastUngroundedDate: aircraft.groundingStatus?.lastUngroundedDate
      };

      cache.aircraft[aircraftIndex] = {
        ...aircraft,
        groundingStatus,
        status: 'Out of Service' as const
      };

    } else if (action === 'unground') {
      if (!recordId) {
        return NextResponse.json({ error: 'Record ID is required for ungrounding' }, { status: 400 });
      }

      console.log('Ungrounding - Aircraft ID:', aircraftId);
      console.log('Ungrounding - Record ID:', recordId);
      console.log('Ungrounding - Aircraft grounding status:', aircraft.groundingStatus);
      console.log('Ungrounding - Current record:', aircraft.groundingStatus?.currentRecord);

      const currentRecord = aircraft.groundingStatus?.currentRecord;
      if (!currentRecord) {
        console.log('Ungrounding - No current record found, aircraft is already ungrounded');
        return NextResponse.json({ error: 'Aircraft is already ungrounded' }, { status: 400 });
      }
      
      if (currentRecord.id !== recordId) {
        console.log('Ungrounding - Record ID mismatch:', { expected: recordId, actual: currentRecord.id });
        return NextResponse.json({ error: 'Current grounding record not found' }, { status: 404 });
      }

      // Update the grounding record
      const updatedRecord: GroundingRecord = {
        ...currentRecord,
        isGrounded: false,
        ungroundingDate: new Date().toISOString().split('T')[0],
        daysOnGround: calculateDaysOnGround(currentRecord.groundingDate!, new Date().toISOString().split('T')[0]),
        updatedAt: new Date().toISOString()
      };

      // Update aircraft grounding status
      const groundingStatus: GroundingStatus = {
        isGrounded: false,
        currentRecord: undefined, // Clear current record when ungrounded
        totalDaysGrounded: (aircraft.groundingStatus?.totalDaysGrounded || 0) + updatedRecord.daysOnGround!,
        lastGroundedDate: aircraft.groundingStatus?.lastGroundedDate,
        lastUngroundedDate: updatedRecord.ungroundingDate
      };

      cache.aircraft[aircraftIndex] = {
        ...aircraft,
        groundingStatus,
        status: 'In Service' as const
      };

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const success = await writeCache(cache);
    if (!success) {
      return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }

    return NextResponse.json(cache.aircraft[aircraftIndex]);

  } catch (error) {
    console.error('Error in grounding API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const requestBody = await request.clone().json();
    console.log("PUT Request body:", requestBody);
    const body = await request.json();
    const { aircraftId, recordId, updates } = body;

    console.log('PUT - Aircraft ID:', aircraftId);
    console.log('PUT - Record ID:', recordId);
    console.log('PUT - Updates:', updates);

    if (!aircraftId || !recordId) {
      return NextResponse.json({ error: 'Aircraft ID and Record ID are required' }, { status: 400 });
    }

    const cache = await readCache();
    console.log('PUT - Cache loaded:', { 
      aircraftCount: cache.aircraft?.length || 0
    });
    
    const aircraftIndex = cache.aircraft.findIndex((a: Aircraft) => a.id === aircraftId);

    if (aircraftIndex === -1) {
      console.log('PUT - Aircraft not found:', aircraftId);
      return NextResponse.json({ error: 'Aircraft not found' }, { status: 404 });
    }

    const aircraft = cache.aircraft[aircraftIndex];
    console.log('PUT - Aircraft found:', { 
      id: aircraft.id, 
      name: aircraft.name,
      hasGroundingStatus: !!aircraft.groundingStatus,
      isGrounded: aircraft.groundingStatus?.isGrounded
    });
    
    const currentRecord = aircraft.groundingStatus?.currentRecord;
    console.log('PUT - Current record:', currentRecord);

    if (!currentRecord) {
      console.log('PUT - No current record found');
      return NextResponse.json({ error: 'No current grounding record found' }, { status: 404 });
    }
    
    if (currentRecord.id !== recordId) {
      console.log('PUT - Record ID mismatch:', { expected: recordId, actual: currentRecord.id });
      return NextResponse.json({ error: 'Grounding record not found' }, { status: 404 });
    }

    // Update the grounding record
    const updatedRecord: GroundingRecord = {
      ...currentRecord,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Recalculate days on ground if grounding date changed
    if (updates.groundingDate && !updates.ungroundingDate) {
      updatedRecord.daysOnGround = calculateDaysOnGround(updates.groundingDate);
    }

    // Update aircraft grounding status
    const groundingStatus: GroundingStatus = {
      ...aircraft.groundingStatus,
      currentRecord: updatedRecord
    };

    cache.aircraft[aircraftIndex] = {
      ...aircraft,
      groundingStatus
    };

    const success = await writeCache(cache);
    if (!success) {
      return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }

    return NextResponse.json(cache.aircraft[aircraftIndex]);

  } catch (error) {
    console.error('Error updating grounding record:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const requestBody = await request.clone().json();
    console.log("Request body:", requestBody);
    console.log("Request body:", await request.clone().json());
    const { searchParams } = new URL(request.url);
    const aircraftId = searchParams.get('aircraftId');

    if (!aircraftId) {
      return NextResponse.json({ error: 'Aircraft ID is required' }, { status: 400 });
    }

    const cache = await readCache();
    const aircraft = cache.aircraft.find((a: Aircraft) => a.id === aircraftId);

    if (!aircraft) {
      return NextResponse.json({ error: 'Aircraft not found' }, { status: 404 });
    }

    return NextResponse.json(aircraft.groundingStatus || { isGrounded: false });

  } catch (error) {
    console.error('Error fetching grounding status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
