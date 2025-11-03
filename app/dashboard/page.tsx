'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/Header';
import KanbanBoard from '../../components/KanbanBoard';

const DashboardPage: React.FC = () => {
  const { user, loading, signOut, isAuthenticated } = useAuth();
  const [contentLoaded, setContentLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!loading && user) {
      // Add a small delay for smooth transition
      const timer = setTimeout(() => setContentLoaded(true), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, user]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-64 h-64 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/2 w-64 h-64 bg-gradient-to-r from-indigo-200 to-blue-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
        </div>
        
        <div className="text-center relative z-10 animate-fade-in">
          {/* Enhanced loading spinner */}
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent bg-gradient-to-r from-blue-500 to-purple-500 mx-auto"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent bg-gradient-to-r from-purple-500 to-pink-500 mx-auto absolute top-0 left-1/2 transform -translate-x-1/2 animate-reverse-spin"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg"></div>
          </div>
          <p className="mt-6 text-gray-700 font-medium text-lg animate-pulse">Loading your workspace...</p>
          <div className="mt-2 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce animation-delay-200"></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce animation-delay-400"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Subtle animated background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-100/30 via-transparent to-purple-100/30"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-200/20 to-purple-200/20 rounded-full mix-blend-multiply filter blur-3xl animate-float"></div>
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-200/20 to-pink-200/20 rounded-full mix-blend-multiply filter blur-3xl animate-float-delayed"></div>
      </div>

      {/* Header with enhanced styling */}
      <div className={`relative z-10 transition-all duration-700 ${contentLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="backdrop-blur-sm bg-white/80 border-b border-white/20 shadow-lg">
          <Header 
            userEmail={user.email} 
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Main Content with staggered animation */}
      <main className={`relative z-10 container mx-auto px-6 py-8 transition-all duration-700 delay-200 ${contentLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="backdrop-blur-sm bg-white/30 rounded-2xl shadow-xl border border-white/20 p-6">
          <KanbanBoard />
        </div>
      </main>

      {/* Floating elements for visual interest */}
      <div className="absolute bottom-10 right-10 opacity-30">
        <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-ping"></div>
      </div>
      <div className="absolute top-20 left-10 opacity-20">
        <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

export default DashboardPage;