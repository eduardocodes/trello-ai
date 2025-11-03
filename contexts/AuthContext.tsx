'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { account } from '../lib/appwrite';
import { signUp as authSignUp, signIn as authSignIn, signOut as authSignOut, User, AuthError } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<User>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const currentUser = await account.get();
      setUser({
        $id: currentUser.$id,
        name: currentUser.name,
        email: currentUser.email,
        emailVerification: currentUser.emailVerification
      });
    } catch (error) {
      // User is not authenticated
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<User> => {
    try {
      const newUser = await authSignUp(email, password, name);
      // After successful signup, check auth status to update context
      await checkAuthStatus();
      return newUser;
    } catch (error) {
      throw error;
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      await authSignIn(email, password);
      // After successful signin, check auth status to update context
      await checkAuthStatus();
    } catch (error) {
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await authSignOut();
      setUser(null);
    } catch (error) {
      // Even if logout fails, clear the user state
      setUser(null);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};