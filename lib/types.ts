// TypeScript interfaces for the Trello dashboard

// Appwrite Task interface matching the database schema
export interface AppwriteTask {
  $id: string;
  title: string;
  description?: string | null;
  status: 'todo' | 'inprogress' | 'done';
  order: number;
  imageFileId?: string;
  boardId?: string | null;
  userId?: string | null;
  $createdAt: string;
  $updatedAt: string;
}

// Interface for creating new tasks (without auto-generated fields)
export interface CreateTaskData {
  title: string;
  description?: string;
  status: 'todo' | 'inprogress' | 'done';
  order: number;
  imageFileId?: string;
  boardId?: string;
  userId?: string;
}

// Legacy interfaces for backward compatibility
export interface Task {
  id: string;
  title: string;
  type: 'text' | 'image';
  content?: string;
}

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

export interface BoardData {
  columns: Column[];
}

// New interfaces for shadcn Kanban component
export interface KanbanTask extends Record<string, unknown> {
  id: string;
  name: string;
  column: string;
  type?: 'text' | 'image';
  content?: string;
  order?: number;
  imageFileId?: string;
  boardId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KanbanColumn extends Record<string, unknown> {
  id: string;
  name: string;
}

export interface KanbanBoardData {
  columns: KanbanColumn[];
  tasks: KanbanTask[];
}

// Utility functions to convert between formats
export const convertToKanbanFormat = (boardData: BoardData): KanbanBoardData => {
  const columns: KanbanColumn[] = boardData.columns.map(col => ({
    id: col.id,
    name: col.title
  }));

  const tasks: KanbanTask[] = boardData.columns.flatMap(col =>
    col.tasks.map(task => ({
      id: task.id,
      name: task.title,
      column: col.id,
      type: task.type,
      content: task.content
    }))
  );

  return { columns, tasks };
};

// Convert Appwrite tasks to Kanban format
export const convertAppwriteTasksToKanban = (tasks: AppwriteTask[]): KanbanBoardData => {
  const columns: KanbanColumn[] = [
    { id: 'todo', name: 'To Do' },
    { id: 'inprogress', name: 'In Progress' },
    { id: 'done', name: 'Done' }
  ];

  const kanbanTasks: KanbanTask[] = tasks.map(task => ({
    id: task.$id,
    name: task.title,
    column: task.status,
    type: task.imageFileId ? 'image' : 'text',
    content: task.description || undefined,
    order: task.order,
    imageFileId: task.imageFileId,
    boardId: task.boardId || undefined,
    createdAt: task.$createdAt,
    updatedAt: task.$updatedAt
  }));

  return { columns, tasks: kanbanTasks };
};

// Convert Kanban task to Appwrite format for updates
export const convertKanbanTaskToAppwrite = (task: KanbanTask): Partial<CreateTaskData> => {
  return {
    title: task.name,
    description: task.content,
    status: task.column as 'todo' | 'inprogress' | 'done',
    order: task.order || 0,
    imageFileId: task.imageFileId,
    boardId: task.boardId
  };
};

export const convertFromKanbanFormat = (kanbanData: KanbanBoardData): BoardData => {
  const columns: Column[] = kanbanData.columns.map(col => ({
    id: col.id,
    title: col.name,
    tasks: kanbanData.tasks
      .filter(task => task.column === col.id)
      .map(task => ({
        id: task.id,
        title: task.name,
        type: task.type || 'text' as 'text' | 'image',
        content: task.content
      }))
  }));

  return { columns };
};