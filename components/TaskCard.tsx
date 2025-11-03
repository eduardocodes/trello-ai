import React from 'react';
import { Task } from '../lib/types';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-lg p-3 mb-2 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
      {task.type === 'text' ? (
        <div className="text-sm text-gray-800">
          {task.title}
        </div>
      ) : (
        <div className="bg-green-200 rounded-md p-4 text-center text-sm text-gray-700">
          Imagem
        </div>
      )}
      
      {/* Edit/Delete buttons (hidden for now, can be shown on hover) */}
      <div className="hidden group-hover:flex absolute top-2 right-2 space-x-1">
        {onEdit && (
          <button
            onClick={() => onEdit(task)}
            className="text-gray-400 hover:text-gray-600 text-xs"
          >
            ✏️
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(task.id)}
            className="text-gray-400 hover:text-red-500 text-xs"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskCard;