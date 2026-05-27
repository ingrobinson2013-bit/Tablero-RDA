"use client";
import { useData } from '@/context/DataContext';
import EmptyState from '@/components/EmptyState';
import { SalesByDayChart } from '@/components/Charts';

const fmt   = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
const pct   = (a, b) => b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '0%';

// Formatea YYYY-MM-DD → DD-MM-YYYY para mostrar
const fmtDate = d => {
  if (!d || d === 'Sin Fecha') return d;
  const [y, m, day] = d.split('-');
  return `${day}-${m}-${y}`;
};

// Convierte weekKey "2026-W20" → "Semana 20 — 2026"
const fmtWeek = wk => {
  if (!wk || wk === 'Sin Semana') return wk;
  const [y, w] = wk.split('-W');
  return `Semana ${parseInt(w)} · ${y}`;
};

export default function VentasPage() {
  const { loaded, data: gd } = useData();
  if (!loaded || !gd) return <EmptyState title="Módulo Ventas" description="Carga el Excel de Dropi para ver ventas por día y subtotales semanales." />;

  const { stats, chartSalesByDate } = gd;

  // Ordenar días más reciente primero
  const dias = [...chartSalesByDate].sort((a, b) => b.date.localeCompare(a.date));

  // Agrupar por semana y calcular subtotales
  const weekGroups = {};
  dias.forEach(d => {
    const wk = d.weekKey || 'Sin Semana';
    if (!weekGroups[wk]) weekGroups[wk] = { weekKey: wk, days: [], totals: { orders: 0, confirmed: 0, cancelled: 0, delivered: 0, returned: 0, novedad: 0, revenue: 0, ganancia: 0, cogs: 0, shipping: 0 } };
    weekGroups[wk].days.push(d);
    const t = weekGroups[wk].totals;
    t.orders    += d.orders    || 0;
    t.confirmed += d.confirmed || 0;
    t.cancelled += d.cancelled || 0;
    t.delivered += d.delivered || 0;
    t.returned  += d.returned  || 0;
    t.novedad   += d.novedad   || 0;
    t.revenue   += d.revenue   || 0;
    t.ganancia  += d.ganancia  || 0;
    t.cogs      += d.cogs      || 0;
    t.shipping  += d.shipping  || 0;
  });

  // Semanas ordenadas más reciente primero
  const semanas = Object.values(weekGroups).sort((a, b) => b.weekKey.localeCompare(a.weekKey));

  const totalDias  = chartSalesByDate.length || 1;
  const promDiario = stats.grossRevenue / totalDias;
  const promPedidos = stats.totalOrders / totalDias;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Módulo de Ventas</h1>
        <p className="text-on-surface-variant text-sm mt-0.5">Detalle diario con subtotales semanales</p>
      </div>

      {/* KPIs resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads',         val: stats.totalOrders,          sub: `${promPedidos.toFixed(0)}/día promedio`,   color: 'text-primary' },
          { label: 'Ventas Brutas',        val: fmt(stats.grossRevenue),    sub: `${fmt(promDiario)}/día promedio`,          color: 'text-on-surface' },
          { label: 'Ingresos Entregados', val: fmt(stats.revenue),          sub: `${stats.delivered} órdenes cobradas`,      color: 'text-emerald-600' },
          { label: 'Ganancia Dropi',      val: fmt(stats.ganancia),         sub: 'Columna GANANCIA del reporte',             color: 'text-emerald-600' },
        ].map(k => (
          <div key={k.label} className="glass-card rounded-premium p-5">
            <div className="text-xs text-on-surface-variant mb-2">{k.label}</div>
            <div className={`text-2xl font-black ${k.color}`}>{k.val}</div>
            <div className="text-xs text-outline mt-2">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Gráfica */}
      <SalesByDayChart data={[...chartSalesByDate].sort((a,b) => a.date.localeCompare(b.date))} />

      {/* Tabla por fecha con subtotales semanales */}
      <div className="glass-card rounded-premium overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-outline-variant">
          <h3 className="font-bold text-on-surface text-base">📅 Detalle por Día — Subtotales Semanales</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase tracking-widest text-on-surface-variant border-b border-outline-variant bg-surface-container-low">
              <tr>
                <th className="px-4 py-3 w-28">Fecha</th>
                <th className="px-3 py-3 text-right">Leads</th>
                <th className="px-3 py-3 text-right">Cancelados</th>
                <th className="px-3 py-3 text-right">Confirmados</th>
                <th className="px-3 py-3 text-right">Entregados</th>
                <th className="px-3 py-3 text-right">Devueltos</th>
                <th className="px-3 py-3 text-right">Novedades</th>
                <th className="px-3 py-3 text-right">% Entrega</th>
                <th className="px-3 py-3 text-right">% Dev</th>
                <th className="px-3 py-3 text-right">Ingresos</th>
                <th className="px-3 py-3 text-right">Ganancia</th>
              </tr>
            </thead>
            <tbody>
              {semanas.map((semana) => (
                <>
                  {/* Filas de días */}
                  {semana.days.map((d, i) => {
                    const delPct = d.orders > 0 ? (d.delivered / d.orders) * 100 : 0;
                    const retPct = d.orders > 0 ? (d.returned  / d.orders) * 100 : 0;
                    return (
                      <tr key={d.date} className="border-b border-outline-variant/30 hover:bg-surface-container/50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-on-surface-variant text-xs">{fmtDate(d.date)}</td>
                        <td className="px-3 py-2.5 text-right text-on-surface-variant">{d.orders}</td>
                        <td className="px-3 py-2.5 text-right text-outline">{d.cancelled || 0}</td>
                        <td className="px-3 py-2.5 text-right text-primary">{d.confirmed || 0}</td>
                        <td className="px-3 py-2.5 text-right text-emerald-600 font-bold">{d.delivered}</td>
                        <td className="px-3 py-2.5 text-right text-rose-600">{d.returned}</td>
                        <td className="px-3 py-2.5 text-right text-amber-600">{d.novedad}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold text-xs ${delPct >= 80 ? 'text-emerald-600' : delPct >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>{delPct.toFixed(1)}%</td>
                        <td className={`px-3 py-2.5 text-right font-semibold text-xs ${retPct > 10 ? 'text-rose-600' : 'text-outline'}`}>{retPct.toFixed(1)}%</td>
                        <td className="px-3 py-2.5 text-right text-on-surface font-medium">{fmt(d.revenue)}</td>
                        <td className="px-3 py-2.5 text-right text-emerald-600">{fmt(d.ganancia)}</td>
                      </tr>
                    );
                  })}

                  {/* Fila subtotal semanal */}
                  {(() => {
                    const t = semana.totals;
                    const delPct = t.orders > 0 ? (t.delivered / t.orders) * 100 : 0;
                    const retPct = t.orders > 0 ? (t.returned  / t.orders) * 100 : 0;
                    return (
                      <tr key={`sub-${semana.weekKey}`} className="border-b-2 border-indigo-500/20 bg-indigo-500/5">
                        <td className="px-4 py-3 font-bold text-indigo-600 text-xs uppercase tracking-wide" colSpan={1}>
                          {fmtWeek(semana.weekKey)}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-on-surface">{t.orders}</td>
                        <td className="px-3 py-3 text-right font-bold text-on-surface-variant">{t.cancelled}</td>
                        <td className="px-3 py-3 text-right font-bold text-primary">{t.confirmed}</td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-600">{t.delivered}</td>
                        <td className="px-3 py-3 text-right font-bold text-rose-600">{t.returned}</td>
                        <td className="px-3 py-3 text-right font-bold text-amber-600">{t.novedad}</td>
                        <td className={`px-3 py-3 text-right font-bold ${delPct >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{delPct.toFixed(1)}%</td>
                        <td className={`px-3 py-3 text-right font-bold ${retPct > 10 ? 'text-rose-600' : 'text-outline'}`}>{retPct.toFixed(1)}%</td>
                        <td className="px-3 py-3 text-right font-bold text-on-surface">{fmt(t.revenue)}</td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-600">{fmt(t.ganancia)}</td>
                      </tr>
                    );
                  })()}
                </>
              ))}
            </tbody>

            {/* Total General */}
            <tfoot>
              <tr className="bg-surface-container border-t-2 border-outline">
                <td className="px-4 py-4 font-black text-on-surface text-xs uppercase tracking-widest">TOTAL GENERAL</td>
                <td className="px-3 py-4 text-right font-black text-on-surface">{stats.totalOrders}</td>
                <td className="px-3 py-4 text-right font-black text-on-surface-variant">{stats.cancelled}</td>
                <td className="px-3 py-4 text-right font-black text-primary">{stats.confirmed}</td>
                <td className="px-3 py-4 text-right font-black text-emerald-600">{stats.delivered}</td>
                <td className="px-3 py-4 text-right font-black text-rose-600">{stats.returned}</td>
                <td className="px-3 py-4 text-right font-black text-amber-600">{stats.novedad}</td>
                <td className={`px-3 py-4 text-right font-black ${stats.deliveryRate >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{(stats.deliveryRate ?? 0).toFixed(1)}%</td>
                <td className={`px-3 py-4 text-right font-black ${stats.returnRate > 10 ? 'text-rose-600' : 'text-outline'}`}>{stats.returnRate.toFixed(1)}%</td>
                <td className="px-3 py-4 text-right font-black text-on-surface">{fmt(stats.revenue)}</td>
                <td className="px-3 py-4 text-right font-black text-emerald-600">{fmt(stats.ganancia)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
