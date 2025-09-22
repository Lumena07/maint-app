import { NextRequest, NextResponse } from "next/server";
import { Component } from "@/lib/types";
import { readCache, updateCacheSection } from "@/lib/kv";

// GET all components
export async function GET() {
  try {
    const cache = await readCache();
    if (!cache) {
      return NextResponse.json({ error: "Cache not available" }, { status: 500 });
    }
    return NextResponse.json(cache.components || []);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to read components" }, { status: 500 });
  }
}

// POST new component
export async function POST(request: NextRequest) {
  try {
    const newComponent: Component = await request.json();
    
    // Generate ID if not provided
    if (!newComponent.id) {
      newComponent.id = `comp-${Date.now()}`;
    }
    
    // Read current data
    const cache = await readCache();
    if (!cache) {
      return NextResponse.json({ error: "Cache not available" }, { status: 500 });
    }
    
    // Add new component
    const updatedComponents = [...(cache.components || []), newComponent];
    const success = await updateCacheSection('components', updatedComponents);
    
    if (!success) {
      return NextResponse.json({ error: "Failed to save component" }, { status: 500 });
    }
    
    return NextResponse.json(newComponent);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to create component" }, { status: 500 });
  }
}

// PUT update component
export async function PUT(request: NextRequest) {
  try {
    const updatedComponent: Component = await request.json();
    
    // Read current data
    const cache = await readCache();
    if (!cache) {
      return NextResponse.json({ error: "Cache not available" }, { status: 500 });
    }
    
    // Update component
    const components = cache.components || [];
    const index = components.findIndex((c: Component) => c.id === updatedComponent.id);
    if (index !== -1) {
      components[index] = updatedComponent;
      const success = await updateCacheSection('components', components);
      
      if (!success) {
        return NextResponse.json({ error: "Failed to save component" }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }
    
    return NextResponse.json(updatedComponent);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to update component" }, { status: 500 });
  }
}

// DELETE component
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const componentId = searchParams.get("id");
    
    if (!componentId) {
      return NextResponse.json({ error: "Component ID required" }, { status: 400 });
    }
    
    // Read current data
    const cache = await readCache();
    if (!cache) {
      return NextResponse.json({ error: "Cache not available" }, { status: 500 });
    }
    
    // Remove component
    const components = cache.components || [];
    const filteredComponents = components.filter((c: Component) => c.id !== componentId);
    const success = await updateCacheSection('components', filteredComponents);
    
    if (!success) {
      return NextResponse.json({ error: "Failed to delete component" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (_error) {
    return NextResponse.json({ error: "Failed to delete component" }, { status: 500 });
  }
}