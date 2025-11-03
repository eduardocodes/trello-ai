import {
  convertToKanbanFormat,
  convertAppwriteTasksToKanban,
  convertKanbanTaskToAppwrite,
  convertFromKanbanFormat,
  BoardData,
  KanbanBoardData,
  AppwriteTask,
  KanbanTask
} from '../types';

describe('Type conversion utilities', () => {
  describe('convertToKanbanFormat', () => {
    it('should convert BoardData to KanbanBoardData format', () => {
      const boardData: BoardData = {
        columns: [
          {
            id: 'col1',
            title: 'To Do',
            tasks: [
              { id: 'task1', title: 'Task 1', type: 'text', content: 'Content 1' },
              { id: 'task2', title: 'Task 2', type: 'image', content: 'Content 2' }
            ]
          },
          {
            id: 'col2',
            title: 'Done',
            tasks: [
              { id: 'task3', title: 'Task 3', type: 'text', content: 'Content 3' }
            ]
          }
        ]
      };

      const result = convertToKanbanFormat(boardData);

      expect(result.columns).toEqual([
        { id: 'col1', name: 'To Do' },
        { id: 'col2', name: 'Done' }
      ]);

      expect(result.tasks).toEqual([
        { id: 'task1', name: 'Task 1', column: 'col1', type: 'text', content: 'Content 1' },
        { id: 'task2', name: 'Task 2', column: 'col1', type: 'image', content: 'Content 2' },
        { id: 'task3', name: 'Task 3', column: 'col2', type: 'text', content: 'Content 3' }
      ]);
    });

    it('should handle empty columns', () => {
      const boardData: BoardData = {
        columns: [
          { id: 'empty', title: 'Empty Column', tasks: [] }
        ]
      };

      const result = convertToKanbanFormat(boardData);

      expect(result.columns).toEqual([{ id: 'empty', name: 'Empty Column' }]);
      expect(result.tasks).toEqual([]);
    });
  });

  describe('convertAppwriteTasksToKanban', () => {
    it('should convert Appwrite tasks to Kanban format', () => {
      const appwriteTasks: AppwriteTask[] = [
        {
          $id: 'task1',
          title: 'Test Task 1',
          description: 'Description 1',
          status: 'todo',
          order: 1,
          imageFileId: undefined,
          boardId: 'board1',
          userId: 'user1',
          $createdAt: '2024-01-01T00:00:00.000Z',
          $updatedAt: '2024-01-01T00:00:00.000Z'
        },
        {
          $id: 'task2',
          title: 'Test Task 2',
          description: null,
          status: 'inprogress',
          order: 2,
          imageFileId: 'image123',
          boardId: null,
          userId: null,
          $createdAt: '2024-01-02T00:00:00.000Z',
          $updatedAt: '2024-01-02T00:00:00.000Z'
        }
      ];

      const result = convertAppwriteTasksToKanban(appwriteTasks);

      expect(result.columns).toEqual([
        { id: 'todo', name: 'To Do' },
        { id: 'inprogress', name: 'In Progress' },
        { id: 'done', name: 'Done' }
      ]);

      expect(result.tasks).toEqual([
        {
          id: 'task1',
          name: 'Test Task 1',
          column: 'todo',
          type: 'text',
          content: 'Description 1',
          order: 1,
          imageFileId: undefined,
          boardId: 'board1',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'task2',
          name: 'Test Task 2',
          column: 'inprogress',
          type: 'image',
          content: undefined,
          order: 2,
          imageFileId: 'image123',
          boardId: undefined,
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z'
        }
      ]);
    });

    it('should handle empty task array', () => {
      const result = convertAppwriteTasksToKanban([]);

      expect(result.columns).toEqual([
        { id: 'todo', name: 'To Do' },
        { id: 'inprogress', name: 'In Progress' },
        { id: 'done', name: 'Done' }
      ]);
      expect(result.tasks).toEqual([]);
    });
  });

  describe('convertKanbanTaskToAppwrite', () => {
    it('should convert Kanban task to Appwrite format', () => {
      const kanbanTask: KanbanTask = {
        id: 'task1',
        name: 'Test Task',
        column: 'todo',
        type: 'text',
        content: 'Task content',
        order: 5,
        imageFileId: 'image123',
        boardId: 'board1'
      };

      const result = convertKanbanTaskToAppwrite(kanbanTask);

      expect(result).toEqual({
        title: 'Test Task',
        description: 'Task content',
        status: 'todo',
        order: 5,
        imageFileId: 'image123',
        boardId: 'board1'
      });
    });

    it('should handle missing optional fields', () => {
      const kanbanTask: KanbanTask = {
        id: 'task1',
        name: 'Minimal Task',
        column: 'done'
      };

      const result = convertKanbanTaskToAppwrite(kanbanTask);

      expect(result).toEqual({
        title: 'Minimal Task',
        description: undefined,
        status: 'done',
        order: 0,
        imageFileId: undefined,
        boardId: undefined
      });
    });
  });

  describe('convertFromKanbanFormat', () => {
    it('should convert KanbanBoardData back to BoardData format', () => {
      const kanbanData: KanbanBoardData = {
        columns: [
          { id: 'todo', name: 'To Do' },
          { id: 'done', name: 'Done' }
        ],
        tasks: [
          { id: 'task1', name: 'Task 1', column: 'todo', type: 'text', content: 'Content 1' },
          { id: 'task2', name: 'Task 2', column: 'todo', type: 'image', content: 'Content 2' },
          { id: 'task3', name: 'Task 3', column: 'done', content: 'Content 3' }
        ]
      };

      const result = convertFromKanbanFormat(kanbanData);

      expect(result.columns).toEqual([
        {
          id: 'todo',
          title: 'To Do',
          tasks: [
            { id: 'task1', title: 'Task 1', type: 'text', content: 'Content 1' },
            { id: 'task2', title: 'Task 2', type: 'image', content: 'Content 2' }
          ]
        },
        {
          id: 'done',
          title: 'Done',
          tasks: [
            { id: 'task3', title: 'Task 3', type: 'text', content: 'Content 3' }
          ]
        }
      ]);
    });

    it('should default to text type when type is missing', () => {
      const kanbanData: KanbanBoardData = {
        columns: [{ id: 'col1', name: 'Column 1' }],
        tasks: [{ id: 'task1', name: 'Task 1', column: 'col1' }]
      };

      const result = convertFromKanbanFormat(kanbanData);

      expect(result.columns[0].tasks[0].type).toBe('text');
    });

    it('should handle columns with no tasks', () => {
      const kanbanData: KanbanBoardData = {
        columns: [{ id: 'empty', name: 'Empty' }],
        tasks: []
      };

      const result = convertFromKanbanFormat(kanbanData);

      expect(result.columns).toEqual([
        { id: 'empty', title: 'Empty', tasks: [] }
      ]);
    });
  });
});