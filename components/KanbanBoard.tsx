import React, { useState } from 'react';
import { BoardData, Task, Column as ColumnType } from '../lib/types';
import Column from './Column';

interface KanbanBoardProps {
  initialData?: BoardData;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ initialData }) => {
  // Default mock data matching the image
  const defaultData: BoardData = {
    columns: [
      {
        id: 'todo',
        title: 'To Do',
        tasks: [
          { id: '1', title: 'tarefa 01', type: 'text' },
          { id: '2', title: 'tarefa 02', type: 'text' },
          { id: '3', title: 'tarefa 03', type: 'text' },
          { id: '4', title: 'Imagem', type: 'image' }
        ]
      },
      {
        id: 'inprogress',
        title: 'In Progress',
        tasks: [
          { id: '5', title: 'tarefa 01', type: 'text' },
          { id: '6', title: 'tarefa 02', type: 'text' },
          { id: '7', title: 'Imagem', type: 'image' }
        ]
      },
      {
        id: 'done',
        title: 'Done',
        tasks: [
          { id: '8', title: 'tarefa 01', type: 'text' }
        ]
      }
    ]
  };

  const [boardData, setBoardData] = useState<BoardData>(initialData || defaultData);

  // Generate unique ID for new tasks
  const generateTaskId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Add new task to a column
  const handleAddTask = (columnId: string, newTask: Omit<Task, 'id'>) => {
    const taskWithId: Task = {
      ...newTask,
      id: generateTaskId()
    };

    setBoardData(prevData => ({
      ...prevData,
      columns: prevData.columns.map(column =>
        column.id === columnId
          ? { ...column, tasks: [...column.tasks, taskWithId] }
          : column
      )
    }));
  };

  // Edit existing task
  const handleEditTask = (updatedTask: Task) => {
    setBoardData(prevData => ({
      ...prevData,
      columns: prevData.columns.map(column => ({
        ...column,
        tasks: column.tasks.map(task =>
          task.id === updatedTask.id ? updatedTask : task
        )
      }))
    }));
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    setBoardData(prevData => ({
      ...prevData,
      columns: prevData.columns.map(column => ({
        ...column,
        tasks: column.tasks.filter(task => task.id !== taskId)
      }))
    }));
  };

  // Calculate total tasks for the summary message
  const getTotalTasks = () => {
    return boardData.columns.reduce((total, column) => total + column.tasks.length, 0);
  };

  const getTaskCounts = () => {
    const counts = boardData.columns.reduce((acc, column) => {
      acc[column.id] = column.tasks.length;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      todo: counts.todo || 0,
      inProgress: counts.inprogress || 0,
      done: counts.done || 0
    };
  };

  const taskCounts = getTaskCounts();

  return (
    <div className="flex flex-col h-full">
      {/* Summary Message */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 rounded-lg px-6 py-3 text-center">
          <p className="text-gray-700 text-sm">
            Olá, Hoje temos {taskCounts.todo} tarefas em To DO, {taskCounts.inProgress} In Progress e {taskCounts.done} em Done
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Tenha um dia produtivo
          </p>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex space-x-6 overflow-x-auto pb-4">
        {boardData.columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard;