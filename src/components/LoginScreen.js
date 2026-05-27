"use client";
import { useState } from 'react';
import { useData } from '@/context/DataContext';

export default function LoginScreen() {
  const { setRole } = useData();
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleCeoLogin = (e) => {
    e.preventDefault();
    // PIN Secreto de ejemplo. Cámbialo en producción.
    if (pin === '7777') {
      setRole('CEO');
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md relative z-10">
        
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-16 h-16 bg-[#14B8A6] rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(20,184,166,0.3)]">
            <span className="material-symbols-outlined text-white text-4xl">dataset</span>
          </div>
          <h1 className="font-display-lg text-3xl font-bold text-white tracking-tighter mb-2">NODIA OPS<span className="text-[#14B8A6]">™</span></h1>
          <p className="text-slate-400 text-sm">Control Operacional E-commerce</p>
        </div>

        {!showPin ? (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-center font-label-mono text-xs uppercase text-slate-500 mb-6 tracking-widest">Selecciona tu Perfil</h2>
            
            <button 
              onClick={() => setShowPin(true)}
              className="w-full text-left p-6 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800 hover:border-[#14B8A6]/50 hover:bg-[#14B8A6]/10 transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#14B8A6]/20 flex items-center justify-center text-[#14B8A6] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Dirección / CEO</h3>
                  <p className="text-xs text-slate-400">Acceso total, Finanzas y Rentabilidad</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-500 group-hover:text-[#14B8A6] transition-colors">chevron_right</span>
            </button>

            <button 
              onClick={() => setRole('VENDEDORA')}
              className="w-full text-left p-6 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-900/20 transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">support_agent</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Operaciones / Ventas</h3>
                  <p className="text-xs text-slate-400">Gestión de Rescates y Nómina Operativa</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-500 group-hover:text-emerald-400 transition-colors">chevron_right</span>
            </button>
          </div>
        ) : (
          <div className="animate-fade-in bg-slate-900/80 backdrop-blur-md p-8 rounded-2xl border border-[#14B8A6]/30 relative">
            <button 
              onClick={() => { setShowPin(false); setPin(''); setError(false); }}
              className="absolute top-4 left-4 text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            
            <div className="text-center mb-6 mt-2">
              <span className="material-symbols-outlined text-4xl text-[#14B8A6] mb-2">lock</span>
              <h3 className="font-bold text-xl text-white">PIN de Acceso</h3>
              <p className="text-xs text-slate-400">Introduce el código del CEO</p>
            </div>

            <form onSubmit={handleCeoLogin} className="space-y-6">
              <div>
                <input 
                  type="password" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className={`w-full bg-slate-950 border ${error ? 'border-red-500 text-red-500' : 'border-slate-700 text-white'} rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-[#14B8A6] transition-colors`}
                  placeholder="••••"
                  maxLength="4"
                  autoFocus
                />
                {error && <p className="text-red-500 text-[10px] text-center mt-2 font-mono uppercase">PIN Incorrecto</p>}
              </div>
              
              <button 
                type="submit"
                className="w-full bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold py-3 px-4 rounded-xl transition-colors"
              >
                Desbloquear
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
