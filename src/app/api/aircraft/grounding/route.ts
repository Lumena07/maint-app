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
    console.log("POST - Starting request processing");
    
    let requestBody;
    try {
      requestBody = await request.clone().json();
      console.log("Request body:", requestBody);
    } catch (jsonError) {
      console.error("POST - Error parsing request JSON:", jsonError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
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
      console.log('GROUNDING - Starting grounding process');
      console.log('GROUNDING - Record data received:', record);
      
      if (!record) {
        console.log('GROUNDING - ERROR: No record data provided');
        return NextResponse.json({ error: 'Grounding record is required' }, { status: 400 });
      }

      console.log('GROUNDING - Aircraft current state before grounding:');
      console.log('GROUNDING - Aircraft ID:', aircraft.id);
      console.log('GROUNDING - Aircraft name:', aircraft.name);
      console.log('GROUNDING - Current grounding status:', aircraft.groundingStatus);
      console.log('GROUNDING - Current aircraft status:', aircraft.status);

      // Generate new record ID
      const newRecordId = generateId();
      console.log('GROUNDING - Generated new record ID:', newRecordId);

      // Create new grounding record
      const newRecord: GroundingRecord = {
        id: newRecordId,
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

      console.log('GROUNDING - Created new grounding record:');
      console.log('GROUNDING - Record ID:', newRecord.id);
      console.log('GROUNDING - Aircraft ID:', newRecord.aircraftId);
      console.log('GROUNDING - Is Grounded:', newRecord.isGrounded);
      console.log('GROUNDING - Grounding Date:', newRecord.groundingDate);
      console.log('GROUNDING - Reason:', newRecord.reason);
      console.log('GROUNDING - Description:', newRecord.description);
      console.log('GROUNDING - Plan of Action:', newRecord.planOfAction);
      console.log('GROUNDING - Spare Parts Required:', newRecord.sparePartsRequired);
      console.log('GROUNDING - Spare Status:', newRecord.spareStatus);
      console.log('GROUNDING - Estimated Ungrounding Date:', newRecord.estimatedUngroundingDate);
      console.log('GROUNDING - Days on Ground:', newRecord.daysOnGround);
      console.log('GROUNDING - Created At:', newRecord.createdAt);
      console.log('GROUNDING - Updated At:', newRecord.updatedAt);

      // Calculate previous total days grounded
      const previousTotalDays = aircraft.groundingStatus?.totalDaysGrounded || 0;
      console.log('GROUNDING - Previous total days grounded:', previousTotalDays);

      // Update aircraft grounding status
      const groundingStatus: GroundingStatus = {
        isGrounded: true,
        currentRecord: newRecord,
        totalDaysGrounded: previousTotalDays,
        lastGroundedDate: newRecord.groundingDate,
        lastUngroundedDate: aircraft.groundingStatus?.lastUngroundedDate
      };

      console.log('GROUNDING - Created new grounding status:');
      console.log('GROUNDING - Is Grounded:', groundingStatus.isGrounded);
      console.log('GROUNDING - Has Current Record:', !!groundingStatus.currentRecord);
      console.log('GROUNDING - Current Record ID:', groundingStatus.currentRecord?.id);
      console.log('GROUNDING - Total Days Grounded:', groundingStatus.totalDaysGrounded);
      console.log('GROUNDING - Last Grounded Date:', groundingStatus.lastGroundedDate);
      console.log('GROUNDING - Last Ungrounded Date:', groundingStatus.lastUngroundedDate);

      // Update aircraft in cache
      const updatedAircraft = {
        ...aircraft,
        groundingStatus,
        status: 'Out of Service' as const
      };

      console.log('GROUNDING - Updated aircraft object:');
      console.log('GROUNDING - Aircraft ID:', updatedAircraft.id);
      console.log('GROUNDING - Aircraft Status:', updatedAircraft.status);
      console.log('GROUNDING - Has Grounding Status:', !!updatedAircraft.groundingStatus);
      console.log('GROUNDING - Is Grounded:', updatedAircraft.groundingStatus?.isGrounded);
      console.log('GROUNDING - Has Current Record:', !!updatedAircraft.groundingStatus?.currentRecord);

      cache.aircraft[aircraftIndex] = updatedAircraft;

      console.log('GROUNDING - Updated cache aircraft at index:', aircraftIndex);
      console.log('GROUNDING - Cache aircraft count after update:', cache.aircraft.length);
      console.log('GROUNDING - Final aircraft in cache:');
      console.log('GROUNDING - Cache aircraft ID:', cache.aircraft[aircraftIndex].id);
      console.log('GROUNDING - Cache aircraft status:', cache.aircraft[aircraftIndex].status);
      console.log('GROUNDING - Cache aircraft isGrounded:', cache.aircraft[aircraftIndex].groundingStatus?.isGrounded);
      console.log('GROUNDING - Cache aircraft currentRecord ID:', cache.aircraft[aircraftIndex].groundingStatus?.currentRecord?.id);

      console.log('GROUNDING - Grounding process completed successfully');

    } else if (action === 'unground') {
      if (!recordId) {
        return NextResponse.json({ error: 'Record ID is required for ungrounding' }, { status: 400 });
      }

      console.log('Ungrounding - Aircraft ID:', aircraftId);
      console.log('Ungrounding - Record ID:', recordId);
      console.log('Ungrounding - Aircraft grounding status:', aircraft.groundingStatus);
      console.log('Ungrounding - Current record:', aircraft.groundingStatus?.currentRecord);

      const currentRecord = aircraft.groundingStatus?.currentRecord;
      
      // If aircraft is already ungrounded, just return the current state
      if (!currentRecord || !aircraft.groundingStatus?.isGrounded) {
        console.log('Ungrounding - Aircraft is already ungrounded, returning current state');
        return NextResponse.json(aircraft);
      }
      
      if (currentRecord.id !== recordId) {
        console.log('Ungrounding - Record ID mismatch:', { expected: recordId, actual: currentRecord.id });
        return NextResponse.json({ error: 'Current grounding record not found' }, { status: 404 });
      }

      console.log('Ungrounding - Proceeding with ungrounding...');

      // Update the grounding record
      const updatedRecord: GroundingRecord = {
        ...currentRecord,
        isGrounded: false,
        ungroundingDate: new Date().toISOString().split('T')[0],
        daysOnGround: calculateDaysOnGround(currentRecord.groundingDate!, new Date().toISOString().split('T')[0]),
        updatedAt: new Date().toISOString()
      };

      console.log('Ungrounding - Updated record:', updatedRecord);

      // Store the completed grounding record in the groundingRecords array
      if (!cache.groundingRecords) {
        cache.groundingRecords = [];
      }
      cache.groundingRecords.push(updatedRecord);
      console.log('Ungrounding - Added to groundingRecords, count:', cache.groundingRecords.length);

      // Update aircraft grounding status
      const groundingStatus: GroundingStatus = {
        isGrounded: false,
        currentRecord: undefined, // Clear current record when ungrounded
        totalDaysGrounded: (aircraft.groundingStatus?.totalDaysGrounded || 0) + updatedRecord.daysOnGround!,
        lastGroundedDate: aircraft.groundingStatus?.lastGroundedDate,
        lastUngroundedDate: updatedRecord.ungroundingDate
      };

      console.log('Ungrounding - New grounding status:', groundingStatus);

      cache.aircraft[aircraftIndex] = {
        ...aircraft,
        groundingStatus,
        status: 'In Service' as const
      };

      console.log('Ungrounding - Updated aircraft in cache:', {
        id: cache.aircraft[aircraftIndex].id,
        status: cache.aircraft[aircraftIndex].status,
        isGrounded: cache.aircraft[aircraftIndex].groundingStatus?.isGrounded,
        hasCurrentRecord: !!cache.aircraft[aircraftIndex].groundingStatus?.currentRecord
      });
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
    console.log("PUT - Starting request processing");
    
    let requestBody;
    try {
      requestBody = await request.clone().json();
      console.log("PUT Request body:", requestBody);
    } catch (jsonError) {
      console.error("PUT - Error parsing request JSON:", jsonError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    const body = await request.json();
    const { aircraftId, recordId, updates } = body;

    console.log('PUT - Aircraft ID:', aircraftId);
    console.log('PUT - Record ID:', recordId);
    console.log('PUT - Updates:', updates);

    if (!aircraftId || !recordId) {
      return NextResponse.json({ error: 'Aircraft ID and Record ID are required' }, { status: 400 });
    }

    let cache;
    try {
      cache = await readCache();
      console.log('PUT - Cache loaded:', { 
        aircraftCount: cache.aircraft?.length || 0
      });
    } catch (cacheError) {
      console.error("PUT - Error reading cache:", cacheError);
      return NextResponse.json({ error: 'Failed to load aircraft data' }, { status: 500 });
    }
    
    if (!cache || !cache.aircraft) {
      console.error("PUT - Cache is null or missing aircraft array");
      return NextResponse.json({ error: 'Aircraft data not available' }, { status: 500 });
    }
    
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

    let recordToUpdate: GroundingRecord | undefined = currentRecord;
    let isCurrentRecord = true;

    // If no current record, search in historical records
    if (!currentRecord) {
      console.log('PUT - No current record found, searching historical records');
      const historicalRecords = cache.groundingRecords || [];
      console.log('PUT - Historical records count:', historicalRecords.length);
      console.log('PUT - Looking for record ID:', recordId, 'for aircraft:', aircraftId);
      console.log('PUT - Available historical record IDs:', historicalRecords.map((r: GroundingRecord) => ({ id: r.id, aircraftId: r.aircraftId })));
      recordToUpdate = historicalRecords.find((r: GroundingRecord) => r.id === recordId && r.aircraftId === aircraftId);
      isCurrentRecord = false;
      console.log('PUT - Historical record found:', !!recordToUpdate);
    }

    if (!recordToUpdate) {
      console.log('PUT - No grounding record found');
      return NextResponse.json({ error: 'Grounding record not found' }, { status: 404 });
    }
    
    if (recordToUpdate.id !== recordId) {
      console.log('PUT - Record ID mismatch:', { expected: recordId, actual: recordToUpdate.id });
      return NextResponse.json({ error: 'Grounding record not found' }, { status: 404 });
    }

    // Update the grounding record
    const updatedRecord: GroundingRecord = {
      ...recordToUpdate,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Recalculate days on ground if grounding date changed
    if (updates.groundingDate && !updates.ungroundingDate) {
      updatedRecord.daysOnGround = calculateDaysOnGround(updates.groundingDate);
    }

    if (isCurrentRecord) {
      // Update current record
      const groundingStatus: GroundingStatus = {
        ...aircraft.groundingStatus,
        currentRecord: updatedRecord
      };

      cache.aircraft[aircraftIndex] = {
        ...aircraft,
        groundingStatus
      };
    } else {
      // Update historical record
      const historicalRecords = cache.groundingRecords || [];
      const recordIndex = historicalRecords.findIndex((r: GroundingRecord) => r.id === recordId);
      if (recordIndex !== -1) {
        historicalRecords[recordIndex] = updatedRecord;
        cache.groundingRecords = historicalRecords;
      }
    }

    let success;
    try {
      success = await writeCache(cache);
      console.log('PUT - Write cache result:', success);
    } catch (writeError) {
      console.error("PUT - Error writing cache:", writeError);
      return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
    
    if (!success) {
      console.error("PUT - Write cache returned false");
      return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }

    console.log('PUT - Successfully updated grounding record');
    return NextResponse.json(cache.aircraft[aircraftIndex]);

  } catch (error) {
    console.error('PUT - Unexpected error updating grounding record:', error);
    if (error instanceof Error) {
      console.error('PUT - Error stack:', error.stack);
    }
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
