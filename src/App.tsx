import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(() => {
    const savedUser = localStorage.getItem('torneio_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setSession((prev: any) => {
          if (prev && prev.id === parsed.id && prev.role === parsed.role) {
            return prev;
          }
          return parsed;
        });
      } catch (e) {
        setSession(null);
      }
    } else {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    checkSession();
    setLoading(false);

    const handleStorageChange = () => checkSession();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('login-success', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('login-success', handleStorageChange);
    };
  }, [checkSession]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={session ? <Navigate to="/dashboard" /> : <Login />} 
        />
        <Route 
          path="/dashboard" 
          element={session ? <Dashboard /> : <Navigate to="/" />} 
        />
      </Routes>
    </Router>
  );
}
