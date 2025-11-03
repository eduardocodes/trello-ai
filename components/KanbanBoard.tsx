'use client';

import React, { useState, useEffect, useRef } from 'react';
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

  // AI Summary state
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [lastSummaryTime, setLastSummaryTime] = useState<number>(0);

  // Modal state for creating a task
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalColumn, setModalColumn] = useState<'todo' | 'inprogress' | 'done'>('todo');
  const [modalImageFile, setModalImageFile] = useState<File | null>(null);
  const [modalDescription, setModalDescription] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColumn, setEditColumn] = useState<'todo' | 'inprogress' | 'done'>('todo');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editExistingImageId, setEditExistingImageId] = useState<string | null>(null);
  const [editImageDeleted, setEditImageDeleted] = useState(false);
  const [editModalLoading, setEditModalLoading] = useState(false);

  // Track original column during drag to detect status changes reliably
  const dragStartColumnRef = useRef<string | null>(null);

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

  // Generate AI summary using detailed task context
  const generateAISummary = async (taskCounts: { todo: number; inProgress: number; done: number }) => {
    // Cache for 5 minutes to reduce API calls
    const now = Date.now();
    const cacheTime = 5 * 60 * 1000; // 5 minutes
    
    if (now - lastSummaryTime < cacheTime && aiSummary) {
      return; // Use cached summary
    }

    try {
      setAiSummaryLoading(true);
      setAiSummaryError(null);

      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskCounts,
          tasks: kanbanData.tasks.map(t => ({
            id: t.id,
            name: t.name,
            column: t.column,
            content: typeof t.content === 'string' ? t.content : undefined,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      setAiSummary(data.summary);
      setLastSummaryTime(now);
      // Persist to sessionStorage so a Strict Mode remount can restore without refetching
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem('ai_summary_text', data.summary || '');
          window.sessionStorage.setItem('ai_summary_time', String(now));
        } catch {}
      }
      
      if (data.fallback) {
        setAiSummaryError('Using fallback message');
      }
    } catch (err) {
      console.error('Error generating AI summary:', err);
      setAiSummaryError('Failed to generate AI summary');
      // Set fallback message
      setAiSummary('Keep up the great work on your tasks!');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  // Generate AI summary when task counts change
  useEffect(() => {
    const taskCounts = {
      todo: kanbanData.tasks.filter(task => task.column === 'todo').length,
      inProgress: kanbanData.tasks.filter(task => task.column === 'inprogress').length,
      done: kanbanData.tasks.filter(task => task.column === 'done').length,
    };

    // Build a stable signature from counts + task snapshot to dedupe in dev (React Strict Mode)
    const signature = JSON.stringify({
      counts: taskCounts,
      tasks: kanbanData.tasks.map(t => `${t.id}:${t.column}:${t.name}:${(t.content || '').slice(0, 60)}`).join('|'),
    });

    // Skip if we've already requested a summary for the same signature recently
    const key = 'ai_summary_signature';
    if (typeof window !== 'undefined') {
      const lastSig = window.sessionStorage.getItem(key);
      const cachedText = window.sessionStorage.getItem('ai_summary_text');
      const cachedTimeRaw = window.sessionStorage.getItem('ai_summary_time');
      const cachedTime = cachedTimeRaw ? Number(cachedTimeRaw) : 0;

      if (lastSig === signature && cachedText) {
        // Restore cached summary on re-mount if present
        if (!aiSummary) {
          setAiSummary(cachedText);
          if (cachedTime) setLastSummaryTime(cachedTime);
        }
        return; // Prevent duplicate request/display caused by Strict Mode re-mounts when summary exists
      }
      // Signature differs OR we don't have a cached summary yet — proceed and store the new signature
      window.sessionStorage.setItem(key, signature);
    }

    // Debounce the API call
    const timeoutId = setTimeout(() => {
      generateAISummary(taskCounts);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [kanbanData.tasks, lastSummaryTime, aiSummary]);

  // Modal helpers
  const openCreateTaskModal = (columnId: string) => {
    setModalColumn(columnId as 'todo' | 'inprogress' | 'done');
    setModalTitle('');
    setModalImageFile(null);
    setModalDescription('');
    setIsModalOpen(true);
  };

  const closeCreateTaskModal = () => {
    setModalTitle('');
    setModalDescription('');
    setModalImageFile(null);
    setModalLoading(false);
    setError(null);
    setIsModalOpen(false);
  };

  const handleModalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setModalImageFile(file);
  };

  const handleCreateTaskFromModal = async () => {
    try {
      if (!modalTitle.trim()) {
        setError('Please enter the task name.');
        return;
      }

      setModalLoading(true);
      setError(null); // Clear any previous errors
      const order = await TaskService.getNextOrder(modalColumn, boardId);

      let imageFileId: string | undefined;

      // Upload image if one is selected
      if (modalImageFile) {
        try {
          const uploadResult = await TaskService.uploadImage(modalImageFile);
          imageFileId = uploadResult.fileId;
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          setError('Failed to upload image. Please try again.');
          setModalLoading(false);
          return;
        }
      }

      const taskData: CreateTaskData = {
        title: modalTitle.trim(),
        description: modalDescription.trim() ? modalDescription.trim() : undefined,
        status: modalColumn,
        order,
        boardId: boardId || undefined,
        imageFileId,
      };

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
          boardId: newTask.boardId || undefined,
          createdAt: newTask.$createdAt,
          updatedAt: newTask.$updatedAt
        }]
      }));

      closeCreateTaskModal(); // This will reset loading state and close modal
    } catch (error) {
      console.error('Error creating task from modal:', error);
      setError('Failed to create task. Please try again.');
      setModalLoading(false);
    }
  };

  // Add new task to a column
  const handleAddTask = async (columnId: string, taskName: string = 'New task') => {
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
  const openEditTaskModal = (taskId: string) => {
    const task = kanbanData.tasks.find(t => t.id === taskId);
    if (!task) return;
    setEditTaskId(taskId);
    setEditTitle(task.name);
    setEditDescription(task.content || '');
    setEditColumn(task.column as 'todo' | 'inprogress' | 'done');
    setEditExistingImageId(task.imageFileId || null);
    setEditImageFile(null);
    setEditImageDeleted(false);
    setIsEditModalOpen(true);
  };

  const closeEditTaskModal = () => {
    setIsEditModalOpen(false);
    setEditTaskId(null);
    setEditTitle('');
    setEditDescription('');
    setEditExistingImageId(null);
    setEditImageFile(null);
    setEditImageDeleted(false);
    setEditModalLoading(false);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      setEditImageDeleted(false); // Reset deleted state when new file is selected
    }
  };

  const handleDeleteEditImage = () => {
    setEditImageDeleted(true);
    setEditImageFile(null);
  };

  const handleUpdateTaskFromModal = async () => {
    try {
      if (!editTaskId) return;
      if (!editTitle.trim()) {
        setError('Please enter the task name.');
        return;
      }

      setEditModalLoading(true);
      setError(null); // Clear any previous errors

      const originalTask = kanbanData.tasks.find(t => t.id === editTaskId);
      if (!originalTask) return;

      const updates: Partial<CreateTaskData> = {
        title: editTitle.trim(),
        description: editDescription.trim() ? editDescription.trim() : undefined,
      };

      // Handle image changes
      let newImageFileId: string | undefined = originalTask.imageFileId;

      // If image was deleted or replaced with new file
      if (editImageDeleted || editImageFile) {
        // Delete old image if it exists
        if (originalTask.imageFileId) {
          try {
            await TaskService.deleteImage(originalTask.imageFileId);
          } catch (error) {
            console.warn('Failed to delete old image file:', error);
          }
        }
        newImageFileId = undefined;
      }

      // If new image file is selected, upload it
      if (editImageFile) {
        try {
          const uploadedFile = await TaskService.uploadImage(editImageFile);
          newImageFileId = uploadedFile.fileId;
        } catch (error) {
          console.error('Failed to upload new image:', error);
          setError('Failed to upload image. Please try again.');
          setEditModalLoading(false);
          return;
        }
      }

      // Add image file ID to updates if it changed
      if (newImageFileId !== originalTask.imageFileId) {
        updates.imageFileId = newImageFileId;
      }

      // If status changed, compute next order for target column
      if (originalTask.column !== editColumn) {
        const newOrder = await TaskService.getNextOrder(editColumn, boardId);
        updates.status = editColumn;
        updates.order = newOrder;
      }

      const updated = await TaskService.updateTask(editTaskId, updates);

      // Update local state
      setKanbanData(prevData => ({
        ...prevData,
        tasks: prevData.tasks.map(task =>
          task.id === editTaskId
            ? {
                ...task,
                name: updated.title,
                content: updated.description || undefined,
                column: updated.status,
                order: updates.order ?? task.order,
                type: newImageFileId ? 'image' : 'text',
                imageFileId: newImageFileId,
                updatedAt: updated.$updatedAt
              }
            : task
        )
      }));

      closeEditTaskModal(); // This will reset loading state and close modal
    } catch (error) {
      console.error('Error updating task:', error);
      setError('Failed to update task. Please try again.');
      setEditModalLoading(false);
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

  // Handle drag start to capture the original column
  const handleDragStart = (event: any) => {
    const activeId = event?.active?.id as string | undefined;
    if (!activeId) {
      dragStartColumnRef.current = null;
      return;
    }
    const task = kanbanData.tasks.find(t => t.id === activeId);
    dragStartColumnRef.current = task?.column || null;
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

    // Determine the new column:
    // - If dropping over a column, over.id equals the column id
    // - If dropping over a card, use that card's column
    const columnFromOver = kanbanData.columns.find(col => col.id === overId)?.id;
    const newColumn = columnFromOver 
      || kanbanData.tasks.find(task => task.id === overId)?.column 
      || activeTask.column;

    // Compare against the original column captured at drag start
    const originalColumn = dragStartColumnRef.current ?? activeTask.column;
    // If the column didn't change, skip persistence (local reordering handled by provider)
    if (originalColumn === newColumn) {
      dragStartColumnRef.current = null;
      return;
    }

    try {
      // Get the next order for the target column
      const newOrder = await TaskService.getNextOrder(newColumn as 'todo' | 'inprogress' | 'done', boardId);

      // Persist status change and new order
      await TaskService.reorderTask(activeId, newColumn as 'todo' | 'inprogress' | 'done', newOrder);

      // Update local state for the moved task
      setKanbanData(prevData => ({
        ...prevData,
        tasks: prevData.tasks.map(task =>
          task.id === activeId
            ? { ...task, column: newColumn, order: newOrder }
            : task
        )
      }));
      dragStartColumnRef.current = null;
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

  // Get header color classes based on column ID
  const getHeaderColorClasses = (columnId: string) => {
    switch (columnId) {
      case 'todo':
        return 'text-red-600 bg-red-50 border-l-4 border-red-500 px-3 py-1 rounded-r-md font-semibold';
      case 'inprogress':
        return 'text-blue-600 bg-blue-50 border-l-4 border-blue-500 px-3 py-1 rounded-r-md font-semibold';
      case 'done':
        return 'text-green-600 bg-green-50 border-l-4 border-green-500 px-3 py-1 rounded-r-md font-semibold';
      default:
        return 'text-gray-600 font-semibold';
    }
  };

  const taskCounts = getTaskCounts();

  return (
    <div className="flex flex-col h-full">
      {/* Summary Message */}
      <div className="flex flex-col items-center mb-4 md:mb-6 px-4 md:px-0">
        <h3 className="text-base md:text-lg font-semibold text-gray-700 mb-2 md:mb-3">AI Summary</h3>
        <div className="bg-gray-100 rounded-lg px-4 md:px-6 py-3 text-center min-h-[60px] flex items-center justify-center w-full max-w-4xl">
          {aiSummaryLoading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-gray-600 text-xs md:text-sm">Generating AI summary…</p>
            </div>
          ) : aiSummary ? (
            <div>
              <p className="text-gray-700 text-xs md:text-sm font-medium">
                {aiSummary}
              </p>
              {aiSummaryError && (
                <p className="text-gray-500 text-xs mt-1">
                  {taskCounts.todo} to do • {taskCounts.inProgress} in progress • {taskCounts.done} done
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-700 text-xs md:text-sm">
                No AI summary yet. Add tasks or update statuses to get a contextual snapshot.
              </p>
            </div>
          )}
        </div>
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
        <div className="flex-1 min-h-0 px-4 md:px-0">
        <KanbanProvider
          columns={kanbanData.columns}
          data={kanbanData.tasks}
          onDataChange={handleDataChange}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className="h-full"
        >
          {(column: KanbanColumn) => (
            <ShadcnKanbanBoard key={column.id} id={column.id} className="h-full">
              <KanbanHeader className="flex items-center justify-between">
                <span className={getHeaderColorClasses(column.id)}>{column.name}</span>
                <button
                  onClick={() => openCreateTaskModal(column.id)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                  title="Add task"
                >
                  <Plus size={16} />
                </button>
              </KanbanHeader>
              
              <KanbanCards id={column.id} className="flex-1 min-h-0">
                {(task: KanbanTask) => (
                  <KanbanCard key={task.id} {...task} className="group relative w-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {task.type === 'text' ? (
                          <>
                            <p className="m-0 font-medium text-sm break-words hyphens-auto leading-relaxed">{task.name}</p>
                            {task.content ? (
                              <p className="mt-2 text-xs text-gray-600 break-words hyphens-auto leading-relaxed max-h-20 overflow-y-auto">{task.content}</p>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <p className="m-0 font-medium text-sm mb-2 break-words hyphens-auto leading-relaxed">{task.name}</p>
                            {task.imageFileId ? (
                              <img 
                                src={TaskService.getImageUrl(task.imageFileId)} 
                                alt={task.name}
                                className="w-full h-32 object-cover rounded-md mb-2"
                                onError={(e) => {
                                  // Fallback to placeholder if image fails to load
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className="bg-green-200 rounded-md p-4 text-center text-sm text-gray-700 hidden">
                              Image
                            </div>
                            {task.content ? (
                              <p className="mt-2 text-xs text-gray-600 break-words hyphens-auto leading-relaxed max-h-20 overflow-y-auto">{task.content}</p>
                            ) : null}
                          </>
                        )}
                      </div>
                      
                      {/* Edit/Delete buttons */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col space-y-1 flex-shrink-0">
                        <button
                          type="button"
                          onPointerDown={(e) => { e.stopPropagation(); }}
                          onMouseDown={(e) => { e.stopPropagation(); }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditTaskModal(task.id);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                          title="Edit task"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          onPointerDown={(e) => { e.stopPropagation(); }}
                          onMouseDown={(e) => { e.stopPropagation(); }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this task?')) {
                              handleDeleteTask(task.id);
                            }
                          }}
                          className="p-1 hover:bg-red-200 rounded transition-colors text-red-600 cursor-pointer"
                          title="Delete task"
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
        contentLabel="Add a task"
        className="relative z-[1001] max-w-sm w-full bg-white rounded-lg shadow-lg p-4 mx-4 md:mx-auto outline-none"
        overlayClassName="fixed inset-0 z-[1000] bg-black/40 flex items-center justify-center p-4"
      >
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Add a task</h2>
          <input
            type="text"
            placeholder="Enter task name"
            value={modalTitle}
            onChange={(e) => setModalTitle(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Task description (optional)"
            value={modalDescription}
            onChange={(e) => setModalDescription(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm min-h-[80px]"
          />
          <div className="grid grid-cols-3 gap-2">
            {(['todo','inprogress','done'] as const).map((col) => {
              const getColumnColors = (column: string, isSelected: boolean) => {
                switch (column) {
                  case 'todo':
                    return isSelected ? 'bg-red-400' : 'bg-red-200';
                  case 'inprogress':
                    return isSelected ? 'bg-blue-400' : 'bg-blue-200';
                  case 'done':
                    return isSelected ? 'bg-green-400' : 'bg-green-200';
                  default:
                    return isSelected ? 'bg-gray-400' : 'bg-gray-200';
                }
              };
              
              return (
                <button
                  key={col}
                  onClick={() => setModalColumn(col)}
                  className={`${getColumnColors(col, modalColumn === col)} rounded px-2 py-2 text-sm cursor-pointer`}
                >
                  {col === 'todo' ? 'To Do' : col === 'inprogress' ? 'In Progress' : 'Done'}
                </button>
              );
            })}
          </div>
          <div>
            <button 
              onClick={() => document.getElementById('modal-file-input')?.click()}
              className="block mb-2 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded px-3 py-2 cursor-pointer transition-colors"
            >
              Upload Image
            </button>
            <input 
              id="modal-file-input"
              type="file" 
              accept="image/*" 
              onChange={handleModalFileChange} 
              className="hidden" 
            />
            {modalImageFile && (
              <div className="mt-2">
                <img 
                  src={URL.createObjectURL(modalImageFile)} 
                  alt="Preview" 
                  className="w-full max-w-[200px] h-auto rounded border"
                />
                <p className="text-xs text-gray-500 mt-1">{modalImageFile.name}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button 
              onClick={closeCreateTaskModal} 
              disabled={modalLoading}
              className="px-3 py-1 text-sm rounded border disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreateTaskFromModal} 
              disabled={modalLoading}
              className="px-3 py-1 text-sm rounded bg-blue-500 text-white disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {modalLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {modalLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onRequestClose={closeEditTaskModal}
        contentLabel="Edit task"
        className="relative z-[1001] max-w-sm w-full bg-white rounded-lg shadow-lg p-4 mx-4 md:mx-auto outline-none"
        overlayClassName="fixed inset-0 z-[1000] bg-black/40 flex items-center justify-center p-4"
      >
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Edit task</h2>
          <input
            type="text"
            placeholder="Task name"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Task description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm min-h-[80px]"
          />
          <div className="grid grid-cols-3 gap-2">
            {(['todo','inprogress','done'] as const).map((col) => {
              const getColumnColors = (column: string, isSelected: boolean) => {
                switch (column) {
                  case 'todo':
                    return isSelected ? 'bg-red-400' : 'bg-red-200';
                  case 'inprogress':
                    return isSelected ? 'bg-blue-400' : 'bg-blue-200';
                  case 'done':
                    return isSelected ? 'bg-green-400' : 'bg-green-200';
                  default:
                    return isSelected ? 'bg-gray-400' : 'bg-gray-200';
                }
              };
              
              return (
                <button
                  key={col}
                  onClick={() => setEditColumn(col)}
                  className={`${getColumnColors(col, editColumn === col)} rounded px-2 py-2 text-sm cursor-pointer`}
                >
                  {col === 'todo' ? 'To Do' : col === 'inprogress' ? 'In Progress' : 'Done'}
                </button>
              );
            })}
          </div>
          <div>
            {/* Show existing image if present and not deleted */}
            {editExistingImageId && !editImageDeleted && !editImageFile && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Current Image:</span>
                  <button
                    onClick={handleDeleteEditImage}
                    className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded border border-red-300 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    Delete Image
                  </button>
                </div>
                <img 
                  src={TaskService.getImageUrl(editExistingImageId)} 
                  alt="Current task image" 
                  className="w-full max-w-[200px] h-auto rounded border"
                />
              </div>
            )}
            
            {/* Show new image preview if selected */}
            {editImageFile && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">New Image:</span>
                  <button
                    onClick={() => setEditImageFile(null)}
                    className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded border border-red-300 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                <img 
                  src={URL.createObjectURL(editImageFile)} 
                  alt="New image preview" 
                  className="w-full max-w-[200px] h-auto rounded border"
                />
                <p className="text-xs text-gray-500 mt-1">{editImageFile.name}</p>
              </div>
            )}
            
            {/* Upload button - show when no image or image was deleted */}
            {(!editExistingImageId || editImageDeleted) && !editImageFile && (
              <button 
                onClick={() => document.getElementById('edit-file-input')?.click()}
                className="block mb-2 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded px-3 py-2 cursor-pointer transition-colors"
              >
                Upload Image
              </button>
            )}
            
            {/* Replace button - show when existing image is present and not deleted */}
            {editExistingImageId && !editImageDeleted && !editImageFile && (
              <button 
                onClick={() => document.getElementById('edit-file-input')?.click()}
                className="block mb-2 text-sm bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded px-3 py-2 cursor-pointer transition-colors"
              >
                Replace Image
              </button>
            )}
            
            <input 
              id="edit-file-input"
              type="file" 
              accept="image/*" 
              onChange={handleEditFileChange} 
              className="hidden" 
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button 
              onClick={closeEditTaskModal} 
              disabled={editModalLoading}
              className="px-3 py-1 text-sm rounded border disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpdateTaskFromModal} 
              disabled={editModalLoading}
              className="px-3 py-1 text-sm rounded bg-blue-500 text-white disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {editModalLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editModalLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default KanbanBoard;