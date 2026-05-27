"use client";
import { useData } from '@/context/DataContext';
import { useEffect, useState } from 'react';

export default function LiveStreamFooter() {
  const { loaded, rawRows } = useData();
  const [stream, setStream] = useState([
    "Sistema iniciado. Esperando conexión de datos..."
  ]);

  useEffect(() => {
    if (loaded && rawRows && rawRows.length > 0) {
      // Pick top 5 latest orders to show as stream
      const recent = rawRows.slice(0, 5).map(r => {
        const id = r['número guia'] || r['id'] || 'N/A';
        const city = r['ciudad destino'] || 'Sin Ciudad';
        const status = r['estatus'] || 'N/A';
        const date = r['fecha de reporte'] || r['fecha'] || '';
        const timeStr = date ? date.split(' ')[1] || new Date().toLocaleTimeString() : new Date().toLocaleTimeString();
        
        let action = `registró el pedido #${id} en ${city}`;
        if (status.includes('NOVEDAD')) action = `reportó NOVEDAD en pedido #${id} en ${city}`;
        if (status.includes('ENTREGADO')) action = `entregó con éxito pedido #${id} en ${city}`;
        if (status.includes('DESPACHADO')) action = `despachó el pedido #${id} hacia ${city}`;

        return { time: timeStr, text: action };
      });
      setStream(recent);
    }
  }, [loaded, rawRows]);

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-surface-container-lowest/90 backdrop-blur-xl border-t border-outline-variant z-50 overflow-hidden">
      <div className="flex items-center h-12 bg-primary/5 border-b border-outline-variant/20 px-6">
        <span className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase whitespace-nowrap">
          <span className="w-2 h-2 bg-primary rounded-full animate-ping"></span>
          Stream en Vivo
        </span>
        <div className="ml-8 flex-1 overflow-hidden">
          <div className="flex gap-12 whitespace-nowrap animate-marquee hover:pause cursor-default">
            {stream.map((s, i) => (
              <span key={i} className="text-xs text-on-surface-variant">
                <b className="text-on-surface">{s.time || ''}</b> {s.text || s}
              </span>
            ))}
            {/* Duplicate for seamless marquee */}
            {stream.map((s, i) => (
              <span key={`dup-${i}`} className="text-xs text-on-surface-variant">
                <b className="text-on-surface">{s.time || ''}</b> {s.text || s}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center px-6 py-3 bg-surface-container-lowest">
        <div className="flex gap-4">
          <span className="text-[10px] font-label-mono text-outline uppercase tracking-widest">© 2026 NODIA OPS™ CORE</span>
          <div className="h-4 w-px bg-outline-variant"></div>
          <span className="text-[10px] font-label-mono text-secondary uppercase">Sistemas Operativos</span>
        </div>
        <div className="flex gap-6">
          <a className="text-outline text-[10px] hover:text-primary transition-colors font-label-mono uppercase" href="#">Consola de Seguridad</a>
          <a className="text-outline text-[10px] hover:text-primary transition-colors font-label-mono uppercase" href="#">Salud de Red</a>
        </div>
      </div>
    </footer>
  );
}
