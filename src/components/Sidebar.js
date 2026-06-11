"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useData } from '@/context/DataContext';
import { useRef } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const { loaded, loadFile, uploading } = useData();
  const fileInputRef = useRef(null);

    const navSections = [
    {
      title: "Analítica",
      items: [
        { name: 'Panel de Control', path: '/dashboard', icon: 'analytics' },
        { name: 'Flujo de Ingresos', path: '/finanzas', icon: 'payments' },
        { name: 'Campañas Meta Ads', path: '/meta-ads', icon: 'ads_click' },
      ]
    },
    {
      title: "Operaciones",
      items: [
        { name: 'Motor de Pedidos', path: '/ventas', icon: 'package_2' },
        { name: 'Flota Logística', path: '/logistica', icon: 'local_shipping' },
        { name: 'Rendimiento Operadores', path: '/operadores', icon: 'support_agent' },
      ]
    },
    {
      title: "Inteligencia IA",
      items: [
        { name: 'Centro de Insights', path: '/devoluciones', icon: 'psychology' },
        { name: 'Mapeo de Ciudades', path: '/ciudades', icon: 'location_on' },
        { name: 'Ops Predictivas', path: '/productos', icon: 'query_stats' },
      ]
    }
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      loadFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <aside className="fixed left-0 top-16 bottom-[86px] w-64 bg-[#0F172A] border-r border-[#1e293b] hidden md:flex flex-col py-6 z-30">
      <nav className="flex-1 px-4 space-y-8 overflow-y-auto">
        {navSections.map(section => (
          <div key={section.title}>
            <p className="px-4 mb-3 font-label-mono text-[10px] text-slate-500 uppercase tracking-[0.2em]">{section.title}</p>
            <div className="space-y-1">
              {section.items.map(m => {
                const isActive = pathname === m.path;
                return (
                  <Link 
                    key={m.path} 
                    href={m.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg group transition-all ${
                      isActive 
                        ? 'text-[#14B8A6] font-bold bg-[#14B8A6]/10 active-pill' 
                        : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[22px] ${isActive ? '' : 'opacity-70 group-hover:opacity-100'}`}>{m.icon}</span>
                    <span className="text-sm">{m.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto px-4 pb-8 space-y-4">
        {/* Sync Component embedded natively */}
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-label-mono uppercase text-slate-500 tracking-widest">Enlace Datos</span>
            {uploading ? (
              <span className="flex items-center gap-1.5 text-[10px] font-label-mono text-yellow-500 uppercase">
                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span> Sincronizando
              </span>
            ) : loaded ? (
              <span className="flex items-center gap-1.5 text-[10px] font-label-mono text-[#14B8A6] uppercase">
                <span className="w-1.5 h-1.5 bg-[#14B8A6] rounded-full"></span> En Vivo
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-label-mono text-red-500 uppercase">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> Offline
              </span>
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-[#14B8A6] py-2 rounded-lg font-bold text-xs hover:bg-[#14B8A6]/20 transition-all flex justify-center items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">{uploading ? 'sync' : 'cloud_upload'}</span>
            {uploading ? 'PROCESANDO...' : 'CARGAR DATOS'}
          </button>
          <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
        </div>

        <button className="w-full bg-white/5 border border-white/10 text-[#CBD5E1] py-2.5 rounded-xl font-bold text-sm hover:bg-white/10 transition-all">
            Configuración del Sistema
        </button>
      </div>
    </aside>
  );
}
