// TypeScript interfaces for the Trello dashboard

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