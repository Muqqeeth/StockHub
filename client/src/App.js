import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PricesProvider } from './context/PricesContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MarketsPage from './pages/MarketsPage';
import TradePage from './pages/TradePage';
import PortfolioPage from './pages/PortfolioPage';
import NewsPage from './pages/NewsPage';
import HistoryPage from './pages/HistoryPage';
import ChatPage from './pages/ChatPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading StockHub...</span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="/" element={<ProtectedRoute><PricesProvider><Layout /></PricesProvider></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="markets" element={<MarketsPage />} />
        <Route path="trade/:symbol?" element={<TradePage />} />
        <Route path="portfolio" element={<PortfolioPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="chat" element={<ChatPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontFamily: 'var(--font-body)', fontSize: 14 },
            success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg-elevated)' } },
            error: { iconTheme: { primary: 'var(--red)', secondary: 'var(--bg-elevated)' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
