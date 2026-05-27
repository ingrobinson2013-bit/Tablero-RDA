"use client";
import { useData } from '@/context/DataContext';
import EmptyState from '@/components/EmptyState';
import { HBarChart } from '@/components/Charts';

const fmt = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

export default function ProductosPage() {
  const { loaded, data: gd } = useData();
  if (!loaded || !gd) return <EmptyState title="Módulo Productos" description="Carga el Excel de Dropi para ver rendimiento por producto." />;
  const { chartProducts } = gd;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Módulo de Productos</h1>
        <p className="text-on-surface-variant text-sm mt-0.5">Ventas, devoluciones y márgenes por producto</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-premium p-6">
          <h3 className="font-bold text-on-surface mb-4">🛍 Top Productos por Órdenes</h3>
          <HBarChart data={chartProducts} dataKey="orders" label="Órdenes" nameKey="product" color="#14b8a6" />
        </div>
        <div className="glass-card rounded-premium p-6">
          <h3 className="font-bold text-on-surface mb-4">📦 Productos con Mayor Devolución</h3>
          <HBarChart data={[...chartProducts].sort((a,b)=>b.retRate-a.retRate)} dataKey="retRate" label="% Dev" nameKey="product" color="#ef4444" suffix="%" />
        </div>
      </div>
      <div className="glass-card rounded-premium p-6 overflow-x-auto shadow-sm">
        <h3 className="font-bold text-on-surface mb-4">Detalle por Producto</h3>
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase text-on-surface-variant border-b border-outline-variant">
            <tr>
              <th className="pb-3">Producto</th>
              <th className="pb-3">SKU</th>
              <th className="pb-3 text-right">Órdenes</th>
              <th className="pb-3 text-right">Entregados</th>
              <th className="pb-3 text-right">Devueltos</th>
              <th className="pb-3 text-right">% Dev</th>
              <th className="pb-3 text-right">Ingresos</th>
              <th className="pb-3 text-right">Decisión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {chartProducts.map((p, i) => (
              <tr key={i} className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 font-medium text-on-surface max-w-[180px] truncate">{p.product}</td>
                <td className="py-3 text-outline text-xs">{p.sku || '—'}</td>
                <td className="py-3 text-right text-on-surface-variant">{p.orders}</td>
                <td className="py-3 text-right text-emerald-600 font-bold">{p.delivered}</td>
                <td className="py-3 text-right text-rose-600">{p.returned}</td>
                <td className={`py-3 text-right font-bold ${p.retRate > 15 ? 'text-rose-600' : p.retRate > 8 ? 'text-amber-600' : 'text-on-surface-variant'}`}>{p.retRate.toFixed(1)}%</td>
                <td className="py-3 text-right text-amber-600 font-medium">{fmt(p.revenue)}</td>
                <td className="py-3 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${p.retRate > 20 ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : p.delivered > 5 && p.retRate < 10 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-surface-container text-on-surface-variant border-outline-variant'}`}>
                    {p.retRate > 20 ? '🔴 Pausar' : p.delivered > 5 && p.retRate < 10 ? '✅ Escalar' : '⚠️ Monitorear'}
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
