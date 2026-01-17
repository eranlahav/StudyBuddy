
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { StoreProvider, useStore } from './store';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './pages/Home';
import { ParentDashboard } from './pages/ParentDashboard';
import { ChildDashboard } from './pages/ChildDashboard';
import { ChildDetails } from './pages/ChildDetails';
import { QuizSession } from './pages/QuizSession';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ParentSettings } from './pages/ParentSettings';
import { AddChildPage } from './pages/ParentSettings/AddChildPage';
import { EditChildPage } from './pages/ParentSettings/EditChildPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { InviteManager } from './pages/InviteManager';
import { logger } from './lib/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresSuperAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiresSuperAdmin = false }) => {
  const { parent, authLoading } = useStore();
  const location = useLocation();

  if (authLoading) {
    return <div className="p-8 text-center text-gray-500">מאמת נתונים...</div>;
  }

  if (!parent) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiresSuperAdmin && !parent.isSuperAdmin) {
    return <Navigate to="/parent" replace />;
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
          <Route path="/signup" element={<SignupPage />} />

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
          <Route path="/parent/settings" element={
            <ProtectedRoute>
              <ParentSettings />
            </ProtectedRoute>
          } />
          <Route path="/parent/settings/add-child" element={
            <ProtectedRoute>
              <AddChildPage />
            </ProtectedRoute>
          } />
          <Route path="/parent/settings/edit-child/:id" element={
            <ProtectedRoute>
              <EditChildPage />
            </ProtectedRoute>
          } />

          {/* Super Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute requiresSuperAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/invites" element={
            <ProtectedRoute requiresSuperAdmin>
              <InviteManager />
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
    <ErrorBoundary
      onError={(error, errorInfo) => {
        logger.error('Uncaught error in React tree', {
          componentStack: errorInfo.componentStack
        }, error);
      }}
      onReset={() => {
        logger.info('ErrorBoundary reset - attempting recovery');
      }}
    >
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </ErrorBoundary>
  );
};

export default App;
