
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { StoreProvider, useStore } from './store';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { ParentDashboard } from './pages/ParentDashboard';
import { ChildDashboard } from './pages/ChildDashboard';
import { ChildDetails } from './pages/ChildDetails';
import { QuizSession } from './pages/QuizSession';
import { LoginPage } from './pages/LoginPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loadingAuth } = useStore();
  const location = useLocation();

  if (loadingAuth) {
    return <div className="p-8 text-center text-gray-500">מאמת נתונים...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { isLoading } = useStore();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">מתחברים לענן...</p>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected Parent Routes */}
          <Route path="/parent" element={
            <ProtectedRoute>
              <ParentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/parent/child/:id" element={
            <ProtectedRoute>
              <ChildDetails />
            </ProtectedRoute>
          } />
          
          <Route path="/child" element={<ChildDashboard />} />
          <Route path="/session/:childId/:subjectId/:topic" element={<QuizSession />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;
