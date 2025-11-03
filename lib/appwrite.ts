import { Client, Account, ID } from 'appwrite';

// Appwrite configuration
const client = new Client();

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'YOUR_PROJECT_ID');

// Export the account service
export const account = new Account(client);

// Export ID for generating unique user IDs
export { ID };

// Export client for potential future use
export default client;