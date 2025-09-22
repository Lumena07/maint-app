import { NextRequest, NextResponse } from 'next/server';
import { TrainingRecord } from '@/lib/types';
import { readCache, writeCache, updateCacheSection } from '@/lib/kv';

// GET /api/training/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const trainingId = (await params).id;
    
    const cache = await readCache();
    if (!cache) {
      return NextResponse.json({ error: "Cache not available" }, { status: 500 });
    }
    
    const trainingRecords = cache.trainingRecords || [];
    const training = trainingRecords.find((t: TrainingRecord) => t.id === trainingId);
    
    if (!training) {
      return NextResponse.json({ error: 'Training record not found' }, { status: 404 });
    }

    return NextResponse.json(training);
  } catch (error) {
    console.error('Error fetching training record:', error);
    return NextResponse.json({ error: 'Failed to fetch training record' }, { status: 500 });
  }
}

// PUT /api/training/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const trainingId = (await params).id;
    const updatedTraining: TrainingRecord = await request.json();
    
    const cache = await readCache();
    if (!cache) {
      return NextResponse.json({ error: "Cache not available" }, { status: 500 });
    }
    
    const trainingRecords = cache.trainingRecords || [];
    const index = trainingRecords.findIndex((t: TrainingRecord) => t.id === trainingId);
    
    if (index === -1) {
      return NextResponse.json({ error: 'Training record not found' }, { status: 404 });
    }

    const trainingWithUpdates = {
      ...updatedTraining,
      id: trainingId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    trainingRecords[index] = trainingWithUpdates;
    
    const success = await updateCacheSection('trainingRecords', trainingRecords);
    
    if (success) {
      return NextResponse.json(trainingWithUpdates);
    } else {
      return NextResponse.json({ error: "Failed to save training record" }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating training record:', error);
    return NextResponse.json({ error: 'Failed to update training record' }, { status: 500 });
  }
}

// DELETE /api/training/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const trainingId = (await params).id;
    
    const cache = await readCache();
    if (!cache) {
      return NextResponse.json({ error: "Cache not available" }, { status: 500 });
    }
    
    const trainingRecords = cache.trainingRecords || [];
    const filteredRecords = trainingRecords.filter((t: TrainingRecord) => t.id !== trainingId);
    
    if (filteredRecords.length === trainingRecords.length) {
      return NextResponse.json({ error: 'Training record not found' }, { status: 404 });
    }
    
    const success = await updateCacheSection('trainingRecords', filteredRecords);
    
    if (success) {
      return NextResponse.json({ message: 'Training record deleted successfully' });
    } else {
      return NextResponse.json({ error: "Failed to delete training record" }, { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting training record:', error);
    return NextResponse.json({ error: 'Failed to delete training record' }, { status: 500 });
  }
}