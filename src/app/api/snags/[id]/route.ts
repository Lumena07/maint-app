import { NextRequest, NextResponse } from 'next/server';
import { Snag } from '@/lib/types';
import { readCache, writeCache } from '@/lib/kv';

const readCacheData = async (): Promise<any> => {
  try {
    const data = await readCache();
    if (!data) {
      return { aircraft: [], snags: [] };
    }
    return data;
  } catch (error) {
    console.error('Error reading cache:', error);
    return { aircraft: [], snags: [] };
  }
};

const writeCacheData = async (data: any): Promise<boolean> => {
  try {
    return await writeCache(data);
  } catch (error) {
    console.error('Error writing cache:', error);
    return false;
  }
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cache = await readCacheData();
    const snag = cache.snags?.find((s: Snag) => s.id === id);

    if (!snag) {
      return NextResponse.json({ error: 'Snag not found' }, { status: 404 });
    }

    return NextResponse.json(snag);
  } catch (error) {
    console.error('Error fetching snag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { snagId, dateReported, aircraftId, description, status, severity, partsOrdered, action, notes, reportedBy, assignedTo, estimatedResolutionDate } = body;

    const cache = await readCacheData();
    const snagIndex = cache.snags?.findIndex((s: Snag) => s.id === id);

    if (snagIndex === -1 || !cache.snags) {
      return NextResponse.json({ error: 'Snag not found' }, { status: 404 });
    }

    // Check if aircraft exists (if aircraftId is being updated)
    if (aircraftId) {
      const aircraft = cache.aircraft?.find((a: any) => a.id === aircraftId);
      if (!aircraft) {
        return NextResponse.json({ error: 'Aircraft not found' }, { status: 404 });
      }
    }

    // Check if snag ID already exists (if snagId is being updated and different from current)
    if (snagId && snagId !== cache.snags[snagIndex].snagId) {
      const existingSnag = cache.snags.find((s: Snag) => s.snagId === snagId && s.id !== id);
      if (existingSnag) {
        return NextResponse.json({ error: 'Snag ID already exists' }, { status: 400 });
      }
    }

    const updatedSnag: Snag = {
      ...cache.snags[snagIndex],
      ...(snagId && { snagId }),
      ...(dateReported && { dateReported }),
      ...(aircraftId && { aircraftId }),
      ...(description && { description }),
      ...(status && { status }),
      ...(severity && { severity }),
      ...(partsOrdered !== undefined && { partsOrdered }),
      ...(action && { action }),
      ...(notes !== undefined && { notes }),
      ...(reportedBy !== undefined && { reportedBy }),
      ...(assignedTo !== undefined && { assignedTo }),
      ...(estimatedResolutionDate !== undefined && { estimatedResolutionDate }),
      updatedAt: new Date().toISOString()
    };

    cache.snags[snagIndex] = updatedSnag;
    const success = await writeCacheData(cache);
    if (!success) {
      return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }

    return NextResponse.json(updatedSnag);

  } catch (error) {
    console.error('Error updating snag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cache = await readCacheData();
    const snagIndex = cache.snags?.findIndex((s: Snag) => s.id === id);

    if (snagIndex === -1 || !cache.snags) {
      return NextResponse.json({ error: 'Snag not found' }, { status: 404 });
    }

    cache.snags.splice(snagIndex, 1);
    const success = await writeCacheData(cache);
    if (!success) {
      return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Snag deleted successfully' });

  } catch (error) {
    console.error('Error deleting snag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
