import { Client, Account, ID, Databases, Storage, Query, Permission, Role } from 'appwrite';

// Appwrite configuration
const client = new Client();

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'YOUR_PROJECT_ID');

// Export the account service
export const account = new Account(client);

// Export the databases service
export const databases = new Databases(client);

// Export the storage service
export const storage = new Storage(client);

// Database and collection configuration
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'trello-ai';
export const TASKS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID || 'tasks';

// Storage configuration
export const STORAGE_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID || 'task-images';

// Export ID for generating unique user IDs
export { ID, Query, Permission, Role };

// Export client for potential future use
export default client;