import { NextRequest, NextResponse } from 'next/server';
import { TrainingRecord } from '@/lib/types';
import { readCache, writeCache, updateCacheSection } from '@/lib/kv';

// GET /api/training
export async function GET() {
  try {
    const cache = await readCache();
    if (!cache) {
      return NextResponse.json({ error: "Cache not available" }, { status: 500 });
    }
    
    const trainingRecords = cache.trainingRecords || [];
    return NextResponse.json(trainingRecords);
  } catch (error) {
    console.error('Error fetching training records:', error);
    return NextResponse.json({ error: 'Failed to fetch training records' }, { status: 500 });
  }
}

// POST /api/training
export async function POST(request: NextRequest) {
  try {
    const newTraining: TrainingRecord = await request.json();
    
    // Read current data
    const cache = await readCache();
    if (!cache) {
      return NextResponse.json({ error: "Cache not available" }, { status: 500 });
    }
    
    // Add new training record
    const trainingRecords = cache.trainingRecords || [];
    const trainingWithId = {
      ...newTraining,
      id: `training-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    trainingRecords.push(trainingWithId);
    
    const success = await updateCacheSection('trainingRecords', trainingRecords);
    
    if (success) {
      return NextResponse.json(trainingWithId);
    } else {
      return NextResponse.json({ error: "Failed to save training record" }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating training record:', error);
    return NextResponse.json({ error: "Failed to create training record" }, { status: 500 });
  }
}