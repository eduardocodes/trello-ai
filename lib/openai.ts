import OpenAI from 'openai';
import type { KanbanTask } from './types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TaskCounts {
  todo: number;
  inProgress: number;
  done: number;
}

export interface SummaryOptions {
  taskCounts: TaskCounts;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  tasks?: KanbanTask[];
}

/**
 * Generate an AI-powered summary message for the Kanban board
 */
export async function generateAISummary(options: SummaryOptions): Promise<string> {
  const { taskCounts, tasks = [] } = options;
  const currentHour = new Date().getHours();
  
  // Determine time of day
  let timeOfDay: string;
  if (currentHour >= 5 && currentHour < 12) {
    timeOfDay = 'morning';
  } else if (currentHour >= 12 && currentHour < 17) {
    timeOfDay = 'afternoon';
  } else if (currentHour >= 17 && currentHour < 21) {
    timeOfDay = 'evening';
  } else {
    timeOfDay = 'night';
  }

  const totalTasks = taskCounts.todo + taskCounts.inProgress + taskCounts.done;

  // Build compact, strictly grounded task context (limit per column)
  const byColumn: Record<'todo' | 'inprogress' | 'done', { name: string; content?: string }[]> = {
    todo: [],
    inprogress: [],
    done: [],
  };

  for (const t of tasks) {
    const col = (t.column as 'todo' | 'inprogress' | 'done') ?? 'todo';
    if (byColumn[col].length < 5) {
      byColumn[col].push({ name: t.name, content: t.content?.slice(0, 120) });
    }
  }

  const formatList = (items: { name: string; content?: string }[]) =>
    items.map(i => (i.content ? `${i.name} — ${i.content}` : i.name)).join('; ');

  const todoList = formatList(byColumn.todo);
  const inProgressList = formatList(byColumn.inprogress);
  const doneList = formatList(byColumn.done);

  // Create a strictly grounded prompt for the AI
  const prompt = `You are a focused productivity assistant.
You must generate a short summary that is DIFFERENT in wording each time, but STRICTLY grounded in the provided tasks. Do NOT invent tasks or details. Mention only what exists.

Context:
- Time of Day: ${timeOfDay}
- Totals: To Do=${taskCounts.todo}, In Progress=${taskCounts.inProgress}, Done=${taskCounts.done}, All=${totalTasks}
- To Do: ${todoList || '—'}
- In Progress: ${inProgressList || '—'}
- Done: ${doneList || '—'}

Rules:
- 1–2 sentences, max 160 characters.
- Reference specific tasks or groups when possible.
- Vary tone and wording; avoid boilerplate.
- Be actionable and encouraging; never generic.
- Use ONLY the given context.

Return only the summary.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You generate concise, varied summaries grounded strictly in the provided task context. Never hallucinate; do not add external facts.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 120,
      temperature: 0.85,
    });

    const message = completion.choices[0]?.message?.content?.trim();
    
    if (!message) {
      throw new Error('No message generated from OpenAI');
    }
    
    return message;
  } catch (error) {
    console.error('Error generating AI summary:', error);
    
    // Fallback message if AI generation fails
    const fallbackMessages = {
      morning: `Good morning! You have ${totalTasks} tasks today. Let's make it productive!`,
      afternoon: `Good afternoon! ${taskCounts.done} tasks completed, ${taskCounts.todo + taskCounts.inProgress} to go!`,
      evening: `Good evening! You've made progress with ${taskCounts.done} tasks done today.`,
      night: `Working late? ${taskCounts.done} tasks completed. Great dedication!`
    };
    
    return fallbackMessages[timeOfDay as keyof typeof fallbackMessages] || 
           `You have ${taskCounts.todo} tasks to do, ${taskCounts.inProgress} in progress, and ${taskCounts.done} completed.`;
  }
}

/**
 * Check if OpenAI is properly configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}