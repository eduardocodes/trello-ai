'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import {
  KanbanProvider,
  KanbanBoard as ShadcnKanbanBoard,
  KanbanHeader,
  KanbanCards,
  KanbanCard,
  type DragEndEvent,
} from '@/components/ui/shadcn-io/kanban';
import { 
  KanbanBoardData, 
  KanbanTask, 
  KanbanColumn, 
  convertToKanbanFormat,
  BoardData 
} from '../lib/types';

interface KanbanBoardProps {
  initialData?: BoardData;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ initialData }) => {
  // Default mock data matching the original structure
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

  // Convert to Kanban format and manage state
  const [kanbanData, setKanbanData] = useState<KanbanBoardData>(() => 
    convertToKanbanFormat(initialData || defaultData)
  );

  // Generate unique ID for new tasks
  const generateTaskId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Add new task to a column
  const handleAddTask = (columnId: string, taskName: string = 'Nova tarefa') => {
    const newTask: KanbanTask = {
      id: generateTaskId(),
      name: taskName,
      column: columnId,
      type: 'text'
    };

    setKanbanData(prevData => ({
      ...prevData,
      tasks: [...prevData.tasks, newTask]
    }));
  };

  // Edit existing task
  const handleEditTask = (taskId: string, newName: string) => {
    setKanbanData(prevData => ({
      ...prevData,
      tasks: prevData.tasks.map(task =>
        task.id === taskId ? { ...task, name: newName } : task
      )
    }));
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    setKanbanData(prevData => ({
      ...prevData,
      tasks: prevData.tasks.filter(task => task.id !== taskId)
    }));
  };

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    // The shadcn Kanban component handles the data updates automatically
    // through the onDataChange callback
  };

  // Handle data changes from drag and drop
  const handleDataChange = (newTasks: KanbanTask[]) => {
    setKanbanData(prevData => ({
      ...prevData,
      tasks: newTasks
    }));
  };

  // Calculate task counts for summary
  const getTaskCounts = () => {
    const counts = kanbanData.tasks.reduce((acc, task) => {
      acc[task.column] = (acc[task.column] || 0) + 1;
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

      {/* Kanban Board */}
      <div className="flex-1 min-h-0">
        <KanbanProvider
          columns={kanbanData.columns}
          data={kanbanData.tasks}
          onDataChange={handleDataChange}
          onDragEnd={handleDragEnd}
          className="h-full"
        >
          {(column: KanbanColumn) => (
            <ShadcnKanbanBoard key={column.id} id={column.id} className="h-full">
              <KanbanHeader className="flex items-center justify-between">
                <span>{column.name}</span>
                <button
                  onClick={() => handleAddTask(column.id)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Adicionar tarefa"
                >
                  <Plus size={16} />
                </button>
              </KanbanHeader>
              
              <KanbanCards id={column.id} className="flex-1 min-h-0">
                {(task: KanbanTask) => (
                  <KanbanCard key={task.id} {...task} className="group relative">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {task.type === 'text' ? (
                          <p className="m-0 font-medium text-sm">{task.name}</p>
                        ) : (
                          <div className="bg-green-200 rounded-md p-4 text-center text-sm text-gray-700">
                            Imagem
                          </div>
                        )}
                      </div>
                      
                      {/* Edit/Delete buttons */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newName = prompt('Editar tarefa:', task.name);
                            if (newName && newName.trim()) {
                              handleEditTask(task.id, newName.trim());
                            }
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Editar tarefa"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                              handleDeleteTask(task.id);
                            }
                          }}
                          className="p-1 hover:bg-red-200 rounded transition-colors text-red-600"
                          title="Excluir tarefa"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </KanbanCard>
                )}
              </KanbanCards>
            </ShadcnKanbanBoard>
          )}
        </KanbanProvider>
      </div>
    </div>
  );
};

export default KanbanBoard;