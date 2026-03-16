import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ScanUpload from './pages/ScanUpload';
import Vulnerabilities from './pages/Vulnerabilities';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminPanel from './pages/AdminPanel';
import SupportTickets from './pages/SupportTickets';
import { AppLoadingSkeleton, DashboardLoadingSkeleton } from './components/SkeletonLoader';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Protected Route wrapper component
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <DashboardLoadingSkeleton />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Admin Route wrapper component
const AdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <AppLoadingSkeleton />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Check user admin status - use context user or fallback to stored user
  const currentUser = user || (() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  })();
  
  if (!currentUser?.is_admin) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Public Route wrapper (redirect to dashboard if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return <AppLoadingSkeleton />;
  }
  
  if (isAuthenticated) {
    // Check user admin status - use context user or fallback to stored user
    const currentUser = user || (() => {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    })();
    
    // Redirect admin users to admin panel, others to dashboard
    const redirectTo = currentUser?.is_admin ? "/admin" : "/";
    return <Navigate to={redirectTo} replace />;
  }
  
  return children;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
      
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="scans" element={<ScanUpload />} />
        <Route path="vulnerabilities" element={<Vulnerabilities />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<SupportTickets />} />
        <Route path="*" element={<Navigate to="/" />} />
        {/* <Route path="tetsadmin" element={<AdminPanel />} /> */}
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <ToastProvider>
          <NotificationProvider>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </NotificationProvider>
        </ToastProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
