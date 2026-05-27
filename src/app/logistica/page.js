"use client";
import { useData } from '@/context/DataContext';
import EmptyState from '@/components/EmptyState';
import { HBarChart } from '@/components/Charts';

export default function LogisticaPage() {
  const { loaded, data: gd } = useData();
  if (!loaded || !gd) return <EmptyState title="Módulo Logística" description="Carga el Excel para analizar transportadoras, estados y SLA de entrega." />;
  const { stats, chartCouriers, chartStatuses } = gd;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Módulo Logístico</h1>
        <p className="text-on-surface-variant text-sm mt-0.5">Transportadoras, estados de entrega y SLA operativo</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Despachados',   val: stats.dispatched,               sub: `${stats.dispatchRate.toFixed(1)}% de confirmados`,  color: 'text-indigo-600' },
          { label: 'Entregados',    val: stats.delivered,                sub: `${stats.deliveryRate?.toFixed(1)}% efectividad`,     color: 'text-emerald-600' },
          { label: 'Devueltos',     val: stats.returned,                 sub: `${stats.returnRate.toFixed(1)}% tasa devolución`,    color: 'text-rose-600' },
          { label: 'Novedades',     val: stats.novedad,                  sub: `${stats.novedadRate?.toFixed(1)}% de despachados`,   color: 'text-amber-600' },
        ].map(k => (
          <div key={k.label} className="glass-card rounded-premium p-5">
            <div className="text-xs text-on-surface-variant mb-2">{k.label}</div>
            <div className={`text-3xl font-black ${k.color}`}>{k.val}</div>
            <div className="text-xs text-outline mt-2">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Gráficas transportadoras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-premium p-6">
          <h3 className="font-bold text-on-surface mb-4">🚚 Tasa de Entrega por Transportadora</h3>
          <HBarChart data={chartCouriers} dataKey="delRate" label="% Entregados" nameKey="courier" color="#10b981" suffix="%" />
        </div>
        <div className="glass-card rounded-premium p-6">
          <h3 className="font-bold text-on-surface mb-4">📦 Tasa de Devolución por Transportadora</h3>
          <HBarChart data={chartCouriers} dataKey="retRate" label="% Devueltos" nameKey="courier" color="#ef4444" suffix="%" />
        </div>
      </div>

      {/* Tabla transportadoras */}
      <div className="glass-card rounded-premium p-6 overflow-x-auto shadow-sm">
        <h3 className="font-bold text-on-surface mb-4">Detalle por Transportadora</h3>
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase text-on-surface-variant border-b border-outline-variant">
            <tr>
              <th className="pb-3">Transportadora</th>
              <th className="pb-3 text-right">Órdenes</th>
              <th className="pb-3 text-right">Entregados</th>
              <th className="pb-3 text-right">Devueltos</th>
              <th className="pb-3 text-right">Novedades</th>
              <th className="pb-3 text-right">% Efectividad</th>
              <th className="pb-3 text-right">% Devolución</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {chartCouriers.map((c, i) => (
              <tr key={i} className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 font-medium text-on-surface">{c.courier}</td>
                <td className="py-3 text-right text-on-surface-variant">{c.orders}</td>
                <td className="py-3 text-right text-emerald-600 font-bold">{c.delivered}</td>
                <td className="py-3 text-right text-rose-600 font-bold">{c.returned}</td>
                <td className="py-3 text-right text-amber-600">{c.novedad}</td>
                <td className={`py-3 text-right font-bold ${c.delRate >= 80 ? 'text-emerald-600' : c.delRate >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>{c.delRate.toFixed(1)}%</td>
                <td className={`py-3 text-right font-bold ${c.retRate > 15 ? 'text-rose-600' : c.retRate > 8 ? 'text-amber-600' : 'text-on-surface-variant'}`}>{c.retRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Estados */}
      <div className="glass-card rounded-premium p-6">
        <h3 className="font-bold text-on-surface mb-4">📋 Distribución de Estados ESTATUS</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {chartStatuses.map((s, i) => (
            <div key={i} className="bg-surface-container border border-outline-variant rounded-xl p-3">
              <div className="text-xs text-on-surface-variant mb-1 truncate" title={s.status}>{s.status}</div>
              <div className="text-xl font-bold text-on-surface">{s.count}</div>
              <div className="text-xs text-outline mt-0.5">{stats.totalOrders > 0 ? ((s.count / stats.totalOrders) * 100).toFixed(1) : 0}% del total</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
