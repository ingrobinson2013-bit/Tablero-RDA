"use client";
import { useData } from '@/context/DataContext';
import EmptyState from '@/components/EmptyState';
import { HBarChart } from '@/components/Charts';

export default function CiudadesPage() {
  const { loaded, data: gd } = useData();
  if (!loaded || !gd) return <EmptyState title="Módulo Ciudades" description="Carga el Excel de Dropi para ver el análisis de riesgo por ciudad." />;
  const { chartCities, chartCitiesByConf, chartDepts } = gd;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Módulo Ciudades</h1>
        <p className="text-on-surface-variant text-sm mt-0.5">Mapa de riesgo por ciudad y departamento — confirmación, entrega y devolución</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-premium p-6">
          <h3 className="font-bold text-on-surface mb-4">📍 Ciudades — Mayor Devolución (Riesgo)</h3>
          <HBarChart data={chartCities.slice(0,10)} dataKey="retRate" label="% Devolución" nameKey="city" color="#ef4444" suffix="%" />
        </div>
        <div className="glass-card rounded-premium p-6">
          <h3 className="font-bold text-on-surface mb-4">📍 Ciudades — Mayor Confirmación (Oportunidad)</h3>
          <HBarChart data={(chartCitiesByConf || chartCities).slice(0,10)} dataKey="confRate" label="% Confirmación" nameKey="city" color="#10b981" suffix="%" />
        </div>
      </div>

      {chartDepts && chartDepts.length > 0 && (
        <div className="glass-card rounded-premium p-6">
          <h3 className="font-bold text-on-surface mb-4">🗺 Top Departamentos por Volumen</h3>
          <HBarChart data={chartDepts} dataKey="orders" label="Órdenes" nameKey="dept" color="#14b8a6" />
        </div>
      )}

      <div className="glass-card rounded-premium p-6 overflow-x-auto shadow-sm">
        <h3 className="font-bold text-on-surface mb-4">Detalle por Ciudad</h3>
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase text-on-surface-variant border-b border-outline-variant">
            <tr>
              <th className="pb-3">Ciudad</th>
              <th className="pb-3 text-right">Órdenes</th>
              <th className="pb-3 text-right">Confirmados</th>
              <th className="pb-3 text-right">Entregados</th>
              <th className="pb-3 text-right">Devueltos</th>
              <th className="pb-3 text-right">% Conf</th>
              <th className="pb-3 text-right">% Entrega</th>
              <th className="pb-3 text-right">% Dev</th>
              <th className="pb-3 text-right">Riesgo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {chartCities.map((c, i) => (
              <tr key={i} className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 font-medium text-on-surface">{c.city}</td>
                <td className="py-3 text-right text-on-surface-variant">{c.orders}</td>
                <td className="py-3 text-right text-primary">{c.confirmed}</td>
                <td className="py-3 text-right text-emerald-600 font-bold">{c.delivered}</td>
                <td className="py-3 text-right text-rose-600">{c.returned}</td>
                <td className={`py-3 text-right font-bold ${c.confRate >= 82 ? 'text-emerald-600' : c.confRate >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>{c.confRate.toFixed(1)}%</td>
                <td className={`py-3 text-right font-bold ${c.delRate >= 80 ? 'text-emerald-600' : 'text-amber-400'}`}>{c.delRate.toFixed(1)}%</td>
                <td className={`py-3 text-right font-bold ${c.retRate > 15 ? 'text-rose-600' : c.retRate > 8 ? 'text-amber-600' : 'text-on-surface-variant'}`}>{c.retRate.toFixed(1)}%</td>
                <td className="py-3 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${c.retRate > 15 ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : c.retRate > 8 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                    {c.retRate > 15 ? '🔴 ALTO' : c.retRate > 8 ? '🟡 MEDIO' : '🟢 BAJO'}
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
