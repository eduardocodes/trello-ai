import { account, ID } from './appwrite';
import { AppwriteException } from 'appwrite';

export interface User {
  $id: string;
  name: string;
  email: string;
  emailVerification: boolean;
}

export interface AuthError {
  message: string;
  code?: string;
}

// Sign up a new user
export const signUp = async (email: string, password: string, name: string): Promise<User> => {
  try {
    const user = await account.create({
      userId: ID.unique(),
      email: email,
      password: password,
      name: name
    });
    
    // Automatically log in the user after successful signup
    await signIn(email, password);
    
    return user;
  } catch (error) {
    console.error('Sign up error:', error);
    throw handleAuthError(error);
  }
};

// Sign in an existing user
export const signIn = async (email: string, password: string): Promise<any> => {
  try {
    const session = await account.createEmailPasswordSession({
      email: email,
      password: password
    });
    return session;
  } catch (error) {
    console.error('Sign in error:', error);
    throw handleAuthError(error);
  }
};

// Sign out the current user
export const signOut = async (): Promise<void> => {
  try {
    await account.deleteSession('current');
  } catch (error) {
    console.error('Sign out error:', error);
    throw handleAuthError(error);
  }
};

// Get the current user
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const user = await account.get();
    return user;
  } catch (error) {
    // User is not logged in
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    await account.get();
    return true;
  } catch {
    return false;
  }
};

// Handle Appwrite errors and convert them to user-friendly messages
const handleAuthError = (error: any): AuthError => {
  if (error instanceof AppwriteException) {
    switch (error.code) {
      case 400:
        if (error.message.includes('password')) {
          return { message: 'Password must be at least 8 characters long', code: error.code.toString() };
        }
        if (error.message.includes('email')) {
          return { message: 'Please enter a valid email address', code: error.code.toString() };
        }
        return { message: 'Invalid input. Please check your information.', code: error.code.toString() };
      
      case 401:
        return { message: 'Invalid email or password', code: error.code.toString() };
      
      case 409:
        return { message: 'An account with this email already exists', code: error.code.toString() };
      
      case 429:
        return { message: 'Too many requests. Please try again later.', code: error.code.toString() };
      
      default:
        return { message: error.message || 'An unexpected error occurred', code: error.code?.toString() };
    }
  }
  
  return { message: 'An unexpected error occurred. Please try again.' };
};