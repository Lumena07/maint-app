import { NextRequest, NextResponse } from 'next/server';
import { Snag } from '@/lib/types';
import { readCache as readBlobCache, updateCacheSection } from '@/lib/kv';

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export async function GET() {
  try {
    const cache = await readBlobCache();
    if (!cache) {
      return NextResponse.json({ error: 'Cache not available' }, { status: 500 });
    }
    return NextResponse.json(cache.snags || []);
  } catch (error) {
    console.error('Error fetching snags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { snagId, dateReported, aircraftId, description, status, severity, partsOrdered, action, notes, reportedBy, assignedTo, estimatedResolutionDate } = body;

    if (!snagId || !dateReported || !aircraftId || !description || !status || !severity || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cache = await readBlobCache();
    if (!cache) {
      return NextResponse.json({ error: 'Cache not available' }, { status: 500 });
    }
    
    // Check if snag ID already exists
    const existingSnag = cache.snags?.find((s: Snag) => s.snagId === snagId);
    if (existingSnag) {
      return NextResponse.json({ error: 'Snag ID already exists' }, { status: 400 });
    }

    // Check if aircraft exists
    const aircraft = cache.aircraft?.find((a: any) => a.id === aircraftId);
    if (!aircraft) {
      return NextResponse.json({ error: 'Aircraft not found' }, { status: 404 });
    }

    const newSnag: Snag = {
      id: generateId(),
      snagId,
      dateReported,
      aircraftId,
      description,
      status,
      severity,
      partsOrdered: partsOrdered || false,
      action,
      notes: notes || '',
      reportedBy: reportedBy || '',
      assignedTo: assignedTo || '',
      estimatedResolutionDate: estimatedResolutionDate || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedSnags = [...(cache.snags || []), newSnag];
    const success = await updateCacheSection('snags', updatedSnags);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to save snag' }, { status: 500 });
    }

    return NextResponse.json(newSnag, { status: 201 });

  } catch (error) {
    console.error('Error creating snag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
