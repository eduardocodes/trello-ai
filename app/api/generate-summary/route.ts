import { NextRequest, NextResponse } from 'next/server';
import { generateAISummary, type TaskCounts } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskCounts }: { taskCounts: TaskCounts } = body;

    // Validate the request body
    if (!taskCounts || typeof taskCounts.todo !== 'number' || 
        typeof taskCounts.inProgress !== 'number' || 
        typeof taskCounts.done !== 'number') {
      return NextResponse.json(
        { error: 'Invalid task counts provided' },
        { status: 400 }
      );
    }

    // Generate AI summary
    const summary = await generateAISummary({ taskCounts });

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