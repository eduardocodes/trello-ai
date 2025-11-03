import { databases, DATABASE_ID, TASKS_COLLECTION_ID, ID, Query, account, Permission, Role } from './appwrite';
import { AppwriteTask, CreateTaskData } from './types';

/**
 * Database service for managing tasks in Appwrite
 */
export class TaskService {
  /**
   * Fetch all tasks from the database
   * @param boardId Optional board ID to filter tasks
   * @returns Promise<AppwriteTask[]>
   */
  static async getAllTasks(boardId?: string): Promise<AppwriteTask[]> {
    try {
      // Ensure we only fetch tasks for the current user
      const user = await account.get();
      const queries = [Query.equal('userId', user.$id)];
      if (boardId) {
        queries.push(Query.equal('boardId', boardId));
      }
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        queries
      );

      return response.documents as unknown as AppwriteTask[];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw new Error('Failed to fetch tasks');
    }
  }

  /**
   * Create a new task
   * @param taskData Task data to create
   * @returns Promise<AppwriteTask>
   */
  static async createTask(taskData: CreateTaskData): Promise<AppwriteTask> {
    try {
      const user = await account.get();
      const dataWithUser = { ...taskData, userId: user.$id };
      const response = await databases.createDocument(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        ID.unique(),
        dataWithUser,
        [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ]
      );

      return response as unknown as AppwriteTask;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error('Failed to create task');
    }
  }

  /**
   * Update an existing task
   * @param taskId Task ID to update
   * @param updates Partial task data to update
   * @returns Promise<AppwriteTask>
   */
  static async updateTask(taskId: string, updates: Partial<CreateTaskData>): Promise<AppwriteTask> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        taskId,
        updates
      );

      return response as unknown as AppwriteTask;
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error('Failed to update task');
    }
  }

  /**
   * Delete a task
   * @param taskId Task ID to delete
   * @returns Promise<void>
   */
  static async deleteTask(taskId: string): Promise<void> {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        taskId
      );
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error('Failed to delete task');
    }
  }

  /**
   * Get the next order value for a specific status column
   * @param status The status column to get the next order for
   * @param boardId Optional board ID to filter tasks
   * @returns Promise<number>
   */
  static async getNextOrder(status: 'todo' | 'inprogress' | 'done', boardId?: string): Promise<number> {
    try {
      const user = await account.get();
      const queries = [
        Query.equal('status', status),
        Query.equal('userId', user.$id),
        Query.orderDesc('order'),
        Query.limit(1)
      ];
      if (boardId) {
        queries.push(Query.equal('boardId', boardId));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        queries
      );

      if (response.documents.length === 0) {
        return 0;
      }

      const lastTask = response.documents[0] as unknown as AppwriteTask;
      return lastTask.order + 1;
    } catch (error) {
      console.error('Error getting next order:', error);
      return 0;
    }
  }

  /**
   * Reorder tasks when moving between columns or within a column
   * @param taskId Task ID to move
   * @param newStatus New status for the task
   * @param newOrder New order position
   * @returns Promise<AppwriteTask>
   */
  static async reorderTask(taskId: string, newStatus: 'todo' | 'inprogress' | 'done', newOrder: number): Promise<AppwriteTask> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        TASKS_COLLECTION_ID,
        taskId,
        {
          status: newStatus,
          order: newOrder
        }
      );

      return response as unknown as AppwriteTask;
    } catch (error) {
      console.error('Error reordering task:', error);
      throw new Error('Failed to reorder task');
    }
  }
}