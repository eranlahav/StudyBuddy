
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Settings, ChevronRight, LogOut } from 'lucide-react';
import { useStore } from '../store';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { parent, family, signOut } = useStore();
  const isParentView = location.pathname.startsWith('/parent');
  const isChildView = location.pathname.startsWith('/child');
  const isHome = location.pathname === '/';
  const isLogin = location.pathname === '/login';
  const isSignup = location.pathname === '/signup';

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (isChildView) {
    return (
      <div className="min-h-screen bg-slate-50 font-kids">
        {/* Child Header */}
        <header className="bg-white p-4 shadow-sm border-b-4 border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
              <div className="bg-indigo-500 text-white p-2 rounded-lg">
                <BookOpen size={24} />
              </div>
              <span className="text-xl font-bold text-slate-700 hidden sm:block">לומדים בבית</span>
            </div>
            {location.pathname !== '/child' && (
               <button 
               onClick={() => navigate(-1)}
               className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-bold bg-slate-100 px-3 py-1 rounded-full transition-colors"
             >
               <ChevronRight size={20} />
               חזור
             </button>
            )}
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-4 md:p-6 pb-20">
          {children}
        </main>
      </div>
    );
  }

  // Parent/Home Layout
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div 
                className="flex-shrink-0 flex items-center cursor-pointer gap-2"
                onClick={() => navigate('/')}
              >
                <BookOpen className="h-8 w-8 text-indigo-600" />
                <span className="text-xl font-bold text-gray-900">לומדים בבית</span>
              </div>
              {isParentView && parent && (
                <div className="hidden sm:mr-6 sm:flex sm:space-x-8 sm:space-x-reverse">
                  <span className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                    {family?.name || 'לוח בקרה להורים'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!isHome && !isParentView && !isLogin && !isSignup && (
                <button
                  onClick={() => navigate('/parent')}
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                >
                  <Settings size={18} />
                  אזור הורים
                </button>
              )}
              {parent && isParentView && (
                <>
                  {/* Parent Info */}
                  <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                    {parent.photoURL ? (
                      <img src={parent.photoURL} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {parent.displayName?.charAt(0) || '?'}
                      </div>
                    )}
                    <span className="font-medium">{parent.displayName}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={18} />
                    <span className="hidden sm:inline">התנתק</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};
