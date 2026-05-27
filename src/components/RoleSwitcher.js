"use client";
import { useData } from '@/context/DataContext';

export default function RoleSwitcher() {
  const { role, toggleRole } = useData();

  return (
    <button 
      onClick={toggleRole}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
        role === 'CEO' 
          ? 'bg-secondary/10 border-secondary/30 text-secondary' 
          : 'bg-tertiary/10 border-tertiary/30 text-tertiary'
      }`}
    >
      <span className="material-symbols-outlined text-[16px]">
        {role === 'CEO' ? 'admin_panel_settings' : 'support_agent'}
      </span>
      {role === 'CEO' ? 'Modo: CEO' : 'Modo: VENDEDORA'}
    </button>
  );
}
