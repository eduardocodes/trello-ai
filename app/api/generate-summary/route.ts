import { NextRequest, NextResponse } from 'next/server';
import { generateAISummary, type TaskCounts } from '@/lib/openai';
import type { KanbanTask } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskCounts, tasks }: { taskCounts: TaskCounts; tasks?: KanbanTask[] } = body;

    // Validate the request body
    if (!taskCounts || typeof taskCounts.todo !== 'number' || 
        typeof taskCounts.inProgress !== 'number' || 
        typeof taskCounts.done !== 'number') {
      return NextResponse.json(
        { error: 'Invalid task counts provided' },
        { status: 400 }
      );
    }

    // Sanitize tasks input (optional array)
    const safeTasks: KanbanTask[] = Array.isArray(tasks)
      ? tasks
          .filter(t => t && typeof t.id === 'string' && typeof t.name === 'string')
          .map(t => ({
            id: t.id,
            name: t.name,
            column: t.column,
            content: typeof t.content === 'string' ? t.content : undefined,
          }))
      : [];

    // Generate AI summary
    const summary = await generateAISummary({ taskCounts, tasks: safeTasks });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error in generate-summary API:', error);
    
    // Return a fallback message if AI generation fails
    const fallbackMessage = "Keep up the great work on your tasks!";
    
    return NextResponse.json(
      { 
        summary: fallbackMessage,
        fallback: true,
        error: 'AI generation failed, using fallback message'
      },
      { status: 200 } // Still return 200 since we have a fallback
    );
  }
}