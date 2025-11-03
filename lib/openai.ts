import OpenAI from 'openai';

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
}

/**
 * Generate an AI-powered summary message for the Kanban board
 */
export async function generateAISummary(options: SummaryOptions): Promise<string> {
  const { taskCounts } = options;
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
  
  // Create a contextual prompt for the AI
  const prompt = `You are a productivity assistant for a Kanban board application. Generate a brief, encouraging, and insightful summary message for the user based on their current task status.

Current Status:
- To Do: ${taskCounts.todo} tasks
- In Progress: ${taskCounts.inProgress} tasks  
- Done: ${taskCounts.done} tasks
- Total Tasks: ${totalTasks}
- Time of Day: ${timeOfDay}

Guidelines:
- Keep the message concise (1-2 sentences, max 100 characters)
- Be encouraging and motivational
- Provide contextual insights based on task distribution
- Consider the time of day in your tone
- Use a friendly, professional tone
- Focus on productivity and progress

Generate only the summary message, no additional text or formatting.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful productivity assistant that generates brief, encouraging summary messages for task management.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
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