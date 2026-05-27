"use client";
import { Upload } from 'lucide-react';
import { useData } from '@/context/DataContext';

export default function EmptyState({ title = "Sin datos", description = "Carga el archivo Excel de Dropi para activar este módulo." }) {
  const { loadFile } = useData();
  const onFile = (e) => { if (e.target.files?.[0]) loadFile(e.target.files[0]); };

  return (
    <div className="h-full flex items-center justify-center p-12">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow">
          <Upload className="text-primary" size={28} />
        </div>
        <h2 className="text-lg font-bold text-on-surface mb-2">{title}</h2>
        <p className="text-on-surface-variant text-sm mb-5">{description}</p>
        <label className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-on-primary px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all shadow-md">
          <Upload size={14} /> Cargar Excel Dropi
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />
        </label>
      </div>
    </div>
  );
}
