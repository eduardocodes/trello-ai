'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import Modal from 'react-modal';
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
  convertAppwriteTasksToKanban,
  BoardData,
  AppwriteTask,
  CreateTaskData
} from '../lib/types';
import { TaskService } from '../lib/database';

interface KanbanBoardProps {
  initialData?: BoardData;
  boardId?: string;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ initialData, boardId }) => {
  // State management
  const [kanbanData, setKanbanData] = useState<KanbanBoardData>({
    columns: [
      { id: 'todo', name: 'To Do' },
      { id: 'inprogress', name: 'In Progress' },
      { id: 'done', name: 'Done' }
    ],
    tasks: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state for creating a task
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalColumn, setModalColumn] = useState<'todo' | 'inprogress' | 'done'>('todo');
  const [modalImageFile, setModalImageFile] = useState<File | null>(null);
  const [modalDescription, setModalDescription] = useState('');

  useEffect(() => {
    // Bind react-modal to the app element for accessibility
    Modal.setAppElement('body');
  }, []);

  // Load tasks from database on component mount
  useEffect(() => {
    loadTasks();
  }, [boardId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const tasks = await TaskService.getAllTasks(boardId);
      const kanbanFormat = convertAppwriteTasksToKanban(tasks);
      setKanbanData(kanbanFormat);
    } catch (err) {
      setError('Failed to load tasks. Please try again.');
      console.error('Error loading tasks:', err);
      // Fallback to default data if provided
      if (initialData) {
        setKanbanData(convertToKanbanFormat(initialData));
      }
    } finally {
      setLoading(false);
    }
  };

  // Modal helpers
  const openCreateTaskModal = (columnId: string) => {
    setModalColumn(columnId as 'todo' | 'inprogress' | 'done');
    setModalTitle('');
    setModalImageFile(null);
    setModalDescription('');
    setIsModalOpen(true);
  };

  const closeCreateTaskModal = () => {
    setModalDescription('');
    setIsModalOpen(false);
  };

  const handleModalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setModalImageFile(file);
  };

  const handleCreateTaskFromModal = async () => {
    try {
      if (!modalTitle.trim()) {
        setError('Por favor, informe o nome da tarefa.');
        return;
      }

      const order = await TaskService.getNextOrder(modalColumn, boardId);

      const taskData: CreateTaskData = {
        title: modalTitle.trim(),
        description: modalDescription.trim() ? modalDescription.trim() : undefined,
        status: modalColumn,
        order,
        boardId: boardId || undefined,
      };

      // TODO: integrate Appwrite Storage for image upload (optional)
      const newTask = await TaskService.createTask(taskData);

      setKanbanData(prevData => ({
        ...prevData,
        tasks: [...prevData.tasks, {
          id: newTask.$id,
          name: newTask.title,
          column: newTask.status,
          type: newTask.imageFileId ? 'image' : 'text',
          content: newTask.description || undefined,
          order: newTask.order,
          imageFileId: newTask.imageFileId,
          imageBucketId: newTask.imageBucketId,
          boardId: newTask.boardId || undefined,
          createdAt: newTask.$createdAt,
          updatedAt: newTask.$updatedAt
        }]
      }));

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating task from modal:', error);
      setError('Falha ao criar tarefa. Tente novamente.');
    }
  };

  // Add new task to a column
  const handleAddTask = async (columnId: string, taskName: string = 'Nova tarefa') => {
    try {
      const order = await TaskService.getNextOrder(columnId as 'todo' | 'inprogress' | 'done', boardId);
      
      const taskData: CreateTaskData = {
        title: taskName,
        status: columnId as 'todo' | 'inprogress' | 'done',
        order,
        boardId: boardId || undefined
      };

      const newTask = await TaskService.createTask(taskData);
      
      // Update local state
      setKanbanData(prevData => ({
        ...prevData,
        tasks: [...prevData.tasks, {
          id: newTask.$id,
          name: newTask.title,
          column: newTask.status,
          type: newTask.imageFileId ? 'image' : 'text',
          content: newTask.description || undefined,
          order: newTask.order,
          imageFileId: newTask.imageFileId,
          imageBucketId: newTask.imageBucketId,
          boardId: newTask.boardId || undefined,
          createdAt: newTask.$createdAt,
          updatedAt: newTask.$updatedAt
        }]
      }));
    } catch (error) {
      console.error('Error adding task:', error);
      setError('Failed to add task. Please try again.');
    }
  };

  // Edit existing task
  const handleEditTask = async (taskId: string, newName: string) => {
    try {
      await TaskService.updateTask(taskId, { title: newName });
      
      // Update local state
      setKanbanData(prevData => ({
        ...prevData,
        tasks: prevData.tasks.map(task =>
          task.id === taskId ? { ...task, name: newName } : task
        )
      }));
    } catch (error) {
      console.error('Error editing task:', error);
      setError('Failed to edit task. Please try again.');
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await TaskService.deleteTask(taskId);
      
      // Update local state
      setKanbanData(prevData => ({
        ...prevData,
        tasks: prevData.tasks.filter(task => task.id !== taskId)
      }));
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('Failed to delete task. Please try again.');
    }
  };

  // Handle drag end event
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the active task
    const activeTask = kanbanData.tasks.find(task => task.id === activeId);
    if (!activeTask) return;

    // Determine the new column
    const newColumn = overId.startsWith('column-') 
      ? overId.replace('column-', '') 
      : kanbanData.tasks.find(task => task.id === overId)?.column || activeTask.column;

    // If dropping on the same position, do nothing
    if (activeTask.column === newColumn && activeId === overId) return;

    try {
      // Get the next order for the new column
      const newOrder = await TaskService.getNextOrder(newColumn as 'todo' | 'inprogress' | 'done', boardId);
      
      // Update task status and order in database
      await TaskService.reorderTask(activeId, newColumn as 'todo' | 'inprogress' | 'done', newOrder);
      
      // Update local state
      setKanbanData(prevData => ({
        ...prevData,
        tasks: prevData.tasks.map(task =>
          task.id === activeId 
            ? { ...task, column: newColumn, order: newOrder }
            : task
        )
      }));
    } catch (error) {
      console.error('Error moving task:', error);
      setError('Failed to move task. Please try again.');
    }
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
      <div className="flex justify-between items-center mb-6">
        <div className="bg-gray-100 rounded-lg px-6 py-3 text-center">
          <p className="text-gray-700 text-sm">
            Olá, Hoje temos {taskCounts.todo} tarefas em To DO, {taskCounts.inProgress} In Progress e {taskCounts.done} em Done
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Tenha um dia produtivo
          </p>
        </div>
        <button
          onClick={loadTasks}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Refresh
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && kanbanData.tasks.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading tasks...</span>
        </div>
      ) : (
        /* Kanban Board */
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
                  onClick={() => openCreateTaskModal(column.id)}
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
                          <>
                            <p className="m-0 font-medium text-sm">{task.name}</p>
                            {task.content ? (
                              <p className="mt-1 text-xs text-gray-600 truncate">{task.content}</p>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <div className="bg-green-200 rounded-md p-4 text-center text-sm text-gray-700">
                              Imagem
                            </div>
                            {task.content ? (
                              <p className="mt-1 text-xs text-gray-600 truncate">{task.content}</p>
                            ) : null}
                          </>
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
      )}
      {/* Create Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeCreateTaskModal}
        contentLabel="Adicionar uma tarefa"
        className="relative z-[1001] max-w-sm w-full bg-white rounded-lg shadow-lg p-4 mx-auto outline-none"
        overlayClassName="fixed inset-0 z-[1000] bg-black/40 flex items-center justify-center"
      >
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Adicione uma tarefa</h2>
          <input
            type="text"
            placeholder="Adicione o nome da task"
            value={modalTitle}
            onChange={(e) => setModalTitle(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Descrição da tarefa (opcional)"
            value={modalDescription}
            onChange={(e) => setModalDescription(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm min-h-[80px]"
          />
          <div className="grid grid-cols-3 gap-2">
            {(['todo','inprogress','done'] as const).map((col) => (
              <button
                key={col}
                onClick={() => setModalColumn(col)}
                className={`${modalColumn === col ? 'bg-pink-400' : 'bg-pink-200'} rounded px-2 py-2 text-sm`}
              >
                {col === 'todo' ? 'To Do' : col === 'inprogress' ? 'In Progress' : 'Done'}
              </button>
            ))}
          </div>
          <div>
            <label className="block mb-1 text-sm">Upload Imagem</label>
            <input type="file" accept="image/*" onChange={handleModalFileChange} className="w-full" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={closeCreateTaskModal} className="px-3 py-1 text-sm rounded border">Cancelar</button>
            <button onClick={handleCreateTaskFromModal} className="px-3 py-1 text-sm rounded bg-blue-500 text-white">Criar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default KanbanBoard;