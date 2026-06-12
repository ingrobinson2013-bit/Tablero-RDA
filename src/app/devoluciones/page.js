"use client";
import { useData } from '@/context/DataContext';
import EmptyState from '@/components/EmptyState';
import { HBarChart } from '@/components/Charts';

const fmt = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

export default function DevolucionesPage() {
  const { loaded, data: gd } = useData();
  if (!loaded || !gd) return <EmptyState title="Módulo Devoluciones" description="Carga el Excel de Dropi para analizar motivos y patrones de devolución." />;
  const { stats, topNovedades, chartCities, chartProducts, chartCouriers } = gd;

  const totalDev = topNovedades.reduce((a, b) => a + b.count, 0);

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Módulo de Devoluciones</h1>
        <p className="text-on-surface-variant text-sm mt-0.5">Análisis de motivos, ciudades y productos con mayor tasa de retorno</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Devueltos',     val: stats.returned,                            sub: `${stats.returnRate.toFixed(1)}% de confirmados`,  color: 'text-rose-600' },
          { label: 'Novedades Activas',   val: stats.novedad,                             sub: `${stats.novedadRate?.toFixed(1)}% pendiente resolver`, color: 'text-amber-600' },
          { label: 'Pérd. por Fletes',    val: fmt(stats.shippingReturns || 0),           sub: 'Costo devolución flete',                           color: 'text-rose-500' },
          { label: 'Tasa Devolución',     val: `${stats.returnRate.toFixed(1)}%`,         sub: stats.returnRate > 10 ? '⚠️ Sobre el umbral' : '✅ Dentro del umbral', color: stats.returnRate > 10 ? 'text-rose-600' : 'text-emerald-600' },
        ].map(k => (
          <div key={k.label} className="glass-card rounded-premium p-5">
            <div className="text-xs text-on-surface-variant mb-2">{k.label}</div>
            <div className={`text-2xl font-black ${k.color}`}>{k.val}</div>
            <div className="text-xs text-outline mt-2">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Motivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-premium p-6">
          <h3 className="font-bold text-on-surface mb-4">⚠️ Motivos de Novedad / Devolución</h3>
          {topNovedades.length > 0 ? (
            <HBarChart data={topNovedades} dataKey="count" label="Casos" nameKey="reason" color="#f59e0b" />
          ) : (
            <p className="text-outline text-sm">No se encontró columna NOVEDAD con detalle en el archivo.</p>
          )}
        </div>

        <div className="glass-card rounded-premium p-6">
          <h3 className="font-bold text-on-surface mb-5">Desglose de Motivos</h3>
          <div className="space-y-3">
            {topNovedades.length > 0 ? topNovedades.map((n, i) => {
              const pct = totalDev > 0 ? (n.count / totalDev) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-on-surface-variant truncate max-w-[70%]">{n.reason}</span>
                    <span className="font-bold text-amber-600 ml-2">{n.count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-1.5">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            }) : <p className="text-outline text-sm">Sin datos de motivos.</p>}
          </div>
        </div>
      </div>

      {/* Top ciudades con devolución */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-premium p-6">
          <h3 className="font-bold text-on-surface mb-4">📍 Ciudades con Mayor Devolución</h3>
          <HBarChart data={chartCities.slice(0,8)} dataKey="retRate" label="% Devolución" nameKey="city" color="#ef4444" suffix="%" />
        </div>
        <div className="glass-card rounded-premium p-6">
          <h3 className="font-bold text-on-surface mb-4">🛍 Productos con Mayor Devolución</h3>
          <HBarChart data={[...chartProducts].sort((a,b)=>b.retRate-a.retRate).slice(0,8)} dataKey="retRate" label="% Devolución" nameKey="product" color="#ef4444" suffix="%" />
        </div>
      </div>

      {/* Tabla ciudades */}
      <div className="glass-card rounded-premium p-6 overflow-x-auto shadow-sm">
        <h3 className="font-bold text-on-surface mb-4">Ciudades — Detalle Devolución</h3>
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase text-on-surface-variant border-b border-outline-variant">
            <tr>
              <th className="pb-3">Ciudad</th>
              <th className="pb-3 text-right">Órdenes</th>
              <th className="pb-3 text-right">Entregados</th>
              <th className="pb-3 text-right">Devueltos</th>
              <th className="pb-3 text-right">% Devolución</th>
              <th className="pb-3 text-right">Riesgo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {chartCities.map((c, i) => (
              <tr key={i} className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 font-medium text-on-surface">{c.city}</td>
                <td className="py-3 text-right text-on-surface-variant">{c.orders}</td>
                <td className="py-3 text-right text-emerald-600">{c.delivered}</td>
                <td className="py-3 text-right text-rose-600 font-bold">{c.returned}</td>
                <td className={`py-3 text-right font-bold ${c.retRate > 15 ? 'text-rose-600' : c.retRate > 8 ? 'text-amber-600' : 'text-on-surface-variant'}`}>{c.retRate.toFixed(1)}%</td>
                <td className="py-3 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${c.retRate > 15 ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : c.retRate > 8 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                    {c.retRate > 15 ? 'ALTO' : c.retRate > 8 ? 'MEDIO' : 'BAJO'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
