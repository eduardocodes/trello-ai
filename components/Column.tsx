import React, { useState } from 'react';
import { Column as ColumnType, Task } from '../lib/types';
import TaskCard from './TaskCard';

interface ColumnProps {
  column: ColumnType;
  onAddTask?: (columnId: string, task: Omit<Task, 'id'>) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
}

const Column: React.FC<ColumnProps> = ({ column, onAddTask, onEditTask, onDeleteTask }) => {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask?.(column.id, {
        title: newTaskTitle.trim(),
        type: 'text'
      });
      setNewTaskTitle('');
      setIsAddingTask(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask();
    } else if (e.key === 'Escape') {
      setIsAddingTask(false);
      setNewTaskTitle('');
    }
  };

  return (
    <div className="bg-gray-100 rounded-lg p-4 w-80 flex flex-col">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-800">
          {column.title}
        </h3>
        <span className="bg-gray-200 text-gray-600 text-sm px-2 py-1 rounded-full">
          {column.tasks.length}
        </span>
      </div>

      {/* Tasks List */}
      <div className="flex-1 space-y-2 mb-4 max-h-96 overflow-y-auto">
        {column.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
          />
        ))}
      </div>

      {/* Add Task Section */}
      {isAddingTask ? (
        <div className="space-y-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Digite o título da tarefa..."
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              onClick={handleAddTask}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              Adicionar
            </button>
            <button
              onClick={() => {
                setIsAddingTask(false);
                setNewTaskTitle('');
              }}
              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingTask(true)}
          className="flex items-center justify-center w-full p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <span className="text-green-500 text-xl mr-2">+</span>
          <span className="text-sm">Adicionar tarefa</span>
        </button>
      )}
    </div>
  );
};

export default Column;