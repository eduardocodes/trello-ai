// TypeScript interfaces for the Trello dashboard

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