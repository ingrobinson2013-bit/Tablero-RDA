"use client";
import { useData } from '@/context/DataContext';
import LoginScreen from './LoginScreen';
import { useEffect, useState } from 'react';

export default function AuthGuard({ children }) {
  const { role } = useData();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!role) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
