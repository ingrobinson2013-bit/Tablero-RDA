"use client";
import { useData } from '@/context/DataContext';
import EmptyState from '@/components/EmptyState';
import { HBarChart } from '@/components/Charts';

export default function OperadoresPage() {
  const { loaded, data: gd } = useData();
  if (!loaded || !gd) return <EmptyState title="Módulo Operadores" description="Carga el Excel de Dropi para ver el rendimiento por vendedor/operador." />;
  const { chartVendedores } = gd;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Módulo de Operadores</h1>
        <p className="text-on-surface-variant text-sm mt-0.5">Rendimiento por vendedor — confirmación, entregas y devoluciones</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-premium p-6">
          <h3 className="font-bold text-on-surface mb-4">👤 Confirmación por Vendedor</h3>
          <HBarChart data={chartVendedores} dataKey="confRate" label="% Confirmación" nameKey="seller" color="#14b8a6" suffix="%" />
        </div>
        <div className="glass-card rounded-premium p-6">
          <h3 className="font-bold text-on-surface mb-4">👤 Tasa Entrega por Vendedor</h3>
          <HBarChart data={chartVendedores} dataKey="delRate" label="% Entregados" nameKey="seller" color="#10b981" suffix="%" />
        </div>
      </div>
      <div className="glass-card rounded-premium p-6 overflow-x-auto shadow-sm">
        <h3 className="font-bold text-on-surface mb-4">Tabla Detalle Operadores / Vendedores</h3>
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase text-on-surface-variant border-b border-outline-variant">
            <tr>
              <th className="pb-3">Vendedor</th>
              <th className="pb-3 text-right">Órdenes</th>
              <th className="pb-3 text-right">Confirmados</th>
              <th className="pb-3 text-right">Entregados</th>
              <th className="pb-3 text-right">Devueltos</th>
              <th className="pb-3 text-right">% Conf</th>
              <th className="pb-3 text-right">% Entrega</th>
              <th className="pb-3 text-right">% Dev</th>
              <th className="pb-3 text-right">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {chartVendedores.map((v, i) => (
              <tr key={i} className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 font-medium text-on-surface">{v.seller}</td>
                <td className="py-3 text-right text-on-surface-variant">{v.orders}</td>
                <td className="py-3 text-right text-primary">{v.confirmed}</td>
                <td className="py-3 text-right text-emerald-600 font-bold">{v.delivered}</td>
                <td className="py-3 text-right text-rose-600">{v.returned}</td>
                <td className={`py-3 text-right font-bold ${v.confRate >= 82 ? 'text-emerald-600' : v.confRate >= 75 ? 'text-amber-600' : 'text-rose-600'}`}>{v.confRate.toFixed(1)}%</td>
                <td className={`py-3 text-right font-bold ${v.delRate >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{v.delRate.toFixed(1)}%</td>
                <td className={`py-3 text-right font-bold ${v.retRate > 12 ? 'text-rose-600' : 'text-on-surface-variant'}`}>{v.retRate.toFixed(1)}%</td>
                <td className="py-3 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${v.confRate >= 82 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : v.confRate >= 75 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}`}>
                    {v.confRate >= 82 ? '✅ OK' : v.confRate >= 75 ? '⚠️ Alerta' : '🔴 Crítico'}
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
