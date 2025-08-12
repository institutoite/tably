
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Login from '@/pages/Login.jsx';
import Register from '@/pages/Register.jsx';
import Dashboard from '@/pages/Dashboard.jsx';
import TestConfig from '@/pages/TestConfig.jsx';
import TestGame from '@/pages/TestGame.jsx';
import Results from '@/pages/Results.jsx';
import Ranking from '@/pages/Ranking.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import Profile from '@/pages/Profile.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }
  return !user ? children : <Navigate to="/dashboard" />;
}

function AppContent() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
      <Helmet>
        <title>Tably - Practica y Compite</title>
        <meta name="description" content="Tably: Aplicación interactiva para practicar tablas de multiplicar con sistema de ranking y seguimiento de progreso." />
      </Helmet>
      
      {user && <Header />}
      
      <main className={`flex-grow ${user ? "pt-16 md:pt-20" : ""}`}>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/test-config" element={<ProtectedRoute><TestConfig /></ProtectedRoute>} />
          <Route path="/test" element={<ProtectedRoute><TestGame /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
          <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
      
  <Footer />
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
