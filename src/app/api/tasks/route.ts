import { NextRequest, NextResponse } from "next/server";
import { readCache, writeCache, updateCacheSection } from "@/lib/kv";
import { MaintenanceTask } from "@/lib/types";

// GET all tasks
export async function GET() {
  try {
    const cache = await readCache();
    if (!cache) {
      return NextResponse.json({ error: "Cache not available" }, { status: 500 });
    }
    return NextResponse.json(cache.tasks || []);
  } catch (_error) {
    return NextResponse.json({ error: "Failed to read tasks" }, { status: 500 });
  }
}

// POST new task
export async function POST(request: NextRequest) {
  try {
    const newTask: MaintenanceTask = await request.json();
    
    // Generate ID if not provided
    if (!newTask.id) {
      newTask.id = `task-${Date.now()}`;
    }
    
    // Read current data
    const cache = await readCache();
    if (!cache) {
      return NextResponse.json({ error: "Cache not available" }, { status: 500 });
    }
    
    // Add new task
    const updatedTasks = [...(cache.tasks || []), newTask];
    const success = await updateCacheSection('tasks', updatedTasks);
    
    if (success) {
      return NextResponse.json(newTask);
    } else {
      return NextResponse.json({ error: "Failed to save task" }, { status: 500 });
    }
  } catch (_error) {
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

// PUT update task
export async function PUT(request: NextRequest) {
  try {
    const updatedTask: MaintenanceTask = await request.json();
    
    // Read current data
    const cache = await readCache();
    if (!cache) {
      return NextResponse.json({ error: "Cache not available" }, { status: 500 });
    }
    
    // Update task
    const tasks = cache.tasks || [];
    const index = tasks.findIndex((t: MaintenanceTask) => t.id === updatedTask.id);
    if (index !== -1) {
      tasks[index] = updatedTask;
      const success = await updateCacheSection('tasks', tasks);
      
      if (success) {
        return NextResponse.json(updatedTask);
      } else {
        return NextResponse.json({ error: "Failed to save task" }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
  } catch (_error) {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

// DELETE task
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("id");
    
    if (!taskId) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }
    
    // Read current data
    const cache = await readCache();
    if (!cache) {
      return NextResponse.json({ error: "Cache not available" }, { status: 500 });
    }
    
    // Remove task
    const tasks = cache.tasks || [];
    const filteredTasks = tasks.filter((t: MaintenanceTask) => t.id !== taskId);
    const success = await updateCacheSection('tasks', filteredTasks);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }
  } catch (_error) {
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
} 