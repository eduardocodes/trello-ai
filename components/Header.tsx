import React from 'react';

interface HeaderProps {
  userEmail?: string;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ userEmail, onLogout }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Trello AI</h1>
        </div>

        {/* Profile Section */}
        <div className="flex items-center space-x-4">
          {/* Profile Avatar */}
          <div className="relative group">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer">
              <span className="text-white font-medium text-sm">
                {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[60]">
              <div className="py-1">
                {userEmail && (
                  <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                    {userEmail}
                  </div>
                )}
                <button
                  onClick={onLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;