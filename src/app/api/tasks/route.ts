import { NextRequest, NextResponse } from "next/server";
import { readCache, writeCache, updateCacheSection } from "@/lib/kv";
import { MaintenanceTask } from "@/lib/types";

// GET all tasks
export async function GET() {
  try {
    const cache = await readCache();
    if (!cache) {
      console.error('GET /api/tasks - Cache not available');
      return NextResponse.json({ error: "Cache not available" }, { status: 500 });
    }
    
    const tasks = cache.tasks || [];
    console.log(`GET /api/tasks - Returning ${tasks.length} tasks`);
    if (tasks.length > 0) {
      console.log('GET /api/tasks - First task:', tasks[0]);
    }
    
    return NextResponse.json(tasks);
  } catch (_error) {
    console.error('GET /api/tasks - Error:', _error);
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
    console.log('PUT /api/tasks - Updating task:', updatedTask.id, updatedTask.title);
    
    // Read current data
    const cache = await readCache();
    if (!cache) {
      console.error('PUT /api/tasks - Cache not available');
      return NextResponse.json({ error: "Cache not available" }, { status: 500 });
    }
    
    // Update task
    const tasks = cache.tasks || [];
    console.log(`PUT /api/tasks - Found ${tasks.length} tasks in cache`);
    const index = tasks.findIndex((t: MaintenanceTask) => t.id === updatedTask.id);
    console.log(`PUT /api/tasks - Task index: ${index}`);
    
    if (index !== -1) {
      console.log('PUT /api/tasks - Before update:', tasks[index]);
      tasks[index] = updatedTask;
      console.log('PUT /api/tasks - After update:', tasks[index]);
      
      const success = await updateCacheSection('tasks', tasks);
      console.log(`PUT /api/tasks - Update result: ${success}`);
      
      if (success) {
        console.log('PUT /api/tasks - Successfully updated task');
        return NextResponse.json(updatedTask);
      } else {
        console.error('PUT /api/tasks - Failed to save to cache');
        return NextResponse.json({ error: "Failed to save task" }, { status: 500 });
      }
    } else {
      console.error(`PUT /api/tasks - Task not found: ${updatedTask.id}`);
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