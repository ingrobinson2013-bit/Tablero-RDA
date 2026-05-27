"use client";
import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';

const fmt = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
const pct = (val, total) => total > 0 ? ((val / total) * 100).toFixed(1) + '%' : '0.0%';

export default function FinanzasPage() {
  const { loaded, data: gd, metaData, role } = useData();
  const [gastoAdmin, setGastoAdmin] = useState('');
  const [timeFrame, setTimeFrame] = useState('Semanal'); // 'Diario', 'Semanal', 'Mensual', 'Total'
  const [selectedPeriod, setSelectedPeriod] = useState('Total'); 

  // --- Inteligencia de Adquisición Real (Dropi x Meta) ---
  const crossData = useMemo(() => {
    if (!gd?.chartSalesByDate) return [];
    
    // Unificar fechas de Dropi y Meta
    const dateSet = new Set(gd.chartSalesByDate.map(d => d.date));
    if (metaData?.daily) {
      metaData.daily.forEach(m => dateSet.add(m.date));
    }
    const allDates = Array.from(dateSet).sort((a,b) => a.localeCompare(b));

    const getWeekKey = (d) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
      const week1 = new Date(date.getFullYear(), 0, 4);
      const weekNum = 1 + Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
      return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    };

    const getMonthKey = (d) => d.substring(0, 7); // YYYY-MM

    const baseDaily = allDates.map(date => {
      const dropi = gd.chartSalesByDate.find(d => d.date === date) || { orders: 0, confirmed: 0, delivered: 0, revenue: 0, grossRevenue: 0 };
      const meta = metaData?.daily?.find(m => m.date === date) || { spend: 0, purchases: 0 };
      
      return {
        date,
        week: getWeekKey(date),
        month: getMonthKey(date),
        spend: meta.spend,
        orders: dropi.orders,
        confirmed: dropi.confirmed,
        delivered: dropi.delivered,
        revenue: dropi.revenue,
        grossRevenue: dropi.grossRevenue || 0,
        cogs: dropi.cogs || 0,
        shipping: dropi.shipping || 0,
        commissions: dropi.commissions || 0,
        grossCogs: dropi.grossCogs || 0,
        grossShipping: dropi.grossShipping || 0,
        grossCommissions: dropi.grossCommissions || 0,
        shippingReturns: dropi.shippingReturns || 0
      };
    });

    const grouped = {};
    baseDaily.forEach(row => {
      let key = 'Total';
      if (timeFrame === 'Diario') key = row.date;
      else if (timeFrame === 'Semanal') key = row.week;
      else if (timeFrame === 'Mensual') key = row.month;
      
      if (!grouped[key]) grouped[key] = { 
        key, spend: 0, orders: 0, confirmed: 0, delivered: 0, revenue: 0, grossRevenue: 0,
        cogs: 0, shipping: 0, commissions: 0, grossCogs: 0, grossShipping: 0, grossCommissions: 0, shippingReturns: 0
      };
      grouped[key].spend += row.spend;
      grouped[key].orders += row.orders;
      grouped[key].confirmed += row.confirmed;
      grouped[key].delivered += row.delivered;
      grouped[key].revenue += row.revenue;
      grouped[key].grossRevenue += row.grossRevenue;
      grouped[key].cogs += row.cogs;
      grouped[key].shipping += row.shipping;
      grouped[key].commissions += row.commissions;
      grouped[key].grossCogs += row.grossCogs;
      grouped[key].grossShipping += row.grossShipping;
      grouped[key].grossCommissions += row.grossCommissions;
      grouped[key].shippingReturns += row.shippingReturns;
    });

    return Object.values(grouped).map(g => {
      // CPA Real (Costo por pedido generado en Dropi)
      const realCpa = g.orders > 0 ? g.spend / g.orders : 0;
      // CAC Real (Costo por pedido ENTREGADO o Confirmado si es nueva data)
      const realCac = g.delivered > 0 ? g.spend / g.delivered : (g.confirmed > 0 ? g.spend / g.confirmed : 0);
      
      // ROAS Real: Calculado sobre las ventas efectivas confirmadas (grossRevenue) para medir eficacia de pauta
      // Si ya hay revenue entregado (revenue), se usa como referencia principal
      const roasBase = g.revenue > 0 ? g.revenue : g.grossRevenue;
      const realRoas = g.spend > 0 ? roasBase / g.spend : 0;

      return { ...g, realCpa, realCac, realRoas, roasBase };
    }).sort((a,b) => b.key.localeCompare(a.key));
    
  }, [gd, metaData, timeFrame]);

  // Reemplazado por lógica dinámica abajo.
  
  const globalStats = gd?.stats || {};

  const stats = useMemo(() => {
    if (timeFrame === 'Total' || selectedPeriod === 'Total') {
      // Sum up everything in crossData if looking at Total
      return crossData.reduce((acc, curr) => {
        Object.keys(acc).forEach(k => {
          if (typeof curr[k] === 'number') acc[k] += curr[k];
        });
        return acc;
      }, { revenue: 0, grossRevenue: 0, cogs: 0, shipping: 0, commissions: 0, grossCogs: 0, grossShipping: 0, grossCommissions: 0, shippingReturns: 0 });
    }
    
    // Find the specific period in crossData
    const found = crossData.find(d => d.key === selectedPeriod);
    if (found) return found;

    return { revenue: 0, grossRevenue: 0, cogs: 0, shipping: 0, commissions: 0, grossCogs: 0, grossShipping: 0, grossCommissions: 0, shippingReturns: 0 };
  }, [crossData, timeFrame, selectedPeriod]);

  // Use filtered spend for Operational Margin if no manual entry
  const filteredSpend = useMemo(() => {
    if (timeFrame === 'Total' || selectedPeriod === 'Total') return crossData.reduce((sum, d) => sum + (d.spend || 0), 0);
    const found = crossData.find(d => d.key === selectedPeriod);
    return found ? found.spend : 0;
  }, [crossData, timeFrame, selectedPeriod]);

  // Use filtered orders/delivered for prorated admin costs
  const filteredDays = useMemo(() => {
    if (timeFrame === 'Total' || selectedPeriod === 'Total') return gd?.chartSalesByDate?.length || 1;
    if (timeFrame === 'Diario') return 1;
    if (timeFrame === 'Semanal') return 7; // Approx
    if (timeFrame === 'Mensual') return 30; // Approx
    return 1;
  }, [timeFrame, selectedPeriod, gd]);

  // KPI del Embudo (Dinámicos según el periodo seleccionado)
  const funnelOrders = stats.orders || 0;
  const funnelConfirmed = stats.confirmed || 0;
  const funnelDelivered = stats.delivered || 0;
  const funnelSpend = filteredSpend;
  
  // ROAS Real: Calculado sobre las ventas efectivas (o brutas si no hay entregas) del periodo seleccionado
  const funnelRoasBase = stats.revenue > 0 ? stats.revenue : (stats.grossRevenue || 0);
  const funnelRealCpa = funnelOrders > 0 ? funnelSpend / funnelOrders : 0;
  const funnelRealCac = funnelDelivered > 0 ? funnelSpend / funnelDelivered : (funnelConfirmed > 0 ? funnelSpend / funnelConfirmed : 0);
  const funnelRealRoas = funnelSpend > 0 ? funnelRoasBase / funnelSpend : 0;

  // 1. INGRESOS
  // Usamos revenue (entregados) como base real. Si es 0, proyectamos asumiendo una tasa de entrega del 80% (20% de devoluciones).
  const isProjected = stats.revenue === 0 && stats.grossRevenue > 0;
  const tasaEntrega = 0.80; // 80% de efectividad
  const tasaDevolucion = 0.20; // 20% de devoluciones

  const ingresosReales = isProjected ? (stats.grossRevenue * tasaEntrega) : (stats.revenue > 0 ? stats.revenue : 0); 

  // 2. MARGEN BRUTO (Target: 65% de Ingresos)
  // Al proyectar con 20% de devolución, la matemática financiera es:
  const costoProducto = isProjected ? (stats.grossCogs * tasaEntrega) : (stats.cogs || 0); // Solo pagamos el costo de lo que se entregó (el 20% regresa al inventario)
  // Como confirmaste, solo se paga 1 vez el flete. Así que el 100% del grossShipping se divide: 80% a flete normal, 20% a pérdida (flete doloroso)
  const flete = isProjected ? (stats.grossShipping * tasaEntrega) : (stats.shipping || 0); 
  const fleteDoloroso = isProjected ? (stats.grossShipping * tasaDevolucion) : (stats.shippingReturns || 0); 
  const comisiones = isProjected ? (stats.grossCommissions * tasaEntrega) : (stats.commissions || 0); // Solo pagamos comisión a Dropi por lo entregado

  const margenBruto = ingresosReales - costoProducto - flete - fleteDoloroso - comisiones;
  
  // 3. MARGEN OPERACIONAL (Target: 65% del Margen Bruto)
  // Plataformas, Internet, Shopify, Publicidad
  const pautaMetaSug = margenBruto * 0.35; // 35% del Margen Bruto
  const pautaActual = filteredSpend; // Gasto real automático de Meta Ads
  const margenOperacional = margenBruto - pautaActual;

  // 4. COSTOS ADMIN Y EBITDA (Target Admin: 10% del Margen Bruto)
  // Software Fijo: Pancake ($19) + OpenAI ($5) = $24 USD/mes (~$96.000 COP/mes)
  const costoFijoMensualCOP = 96000;
  const diasOperados = filteredDays;
  const adminProrrateado = (costoFijoMensualCOP / 30) * diasOperados;
  
  const adminSug = margenBruto * 0.10; // 10% del Margen Bruto
  const adminActual = gastoAdmin !== '' ? parseFloat(gastoAdmin) : adminProrrateado; 
  
  // Nómina Operativa (COO) - Gamificación
  // Si está proyectado y no hay entregados aún, simulamos con el 80% de los confirmados
  const pedidosLiquidados = funnelDelivered > 0 ? funnelDelivered : (funnelConfirmed * tasaEntrega);
  
  // Calcular Devolución Real (para métricas visuales y bonos)
  const tasaDevolucionReal = funnelConfirmed > 0 ? (1 - (funnelDelivered / funnelConfirmed)) : tasaDevolucion;
  
  const baseTariff = 2000;
  const bonusTariff = 500;
  const hasBonus = tasaDevolucionReal < 0.20;
  const tarifaAplicada = hasBonus ? (baseTariff + bonusTariff) : baseTariff;
  
  const pagoCOO = pedidosLiquidados * tarifaAplicada;
  
  const ebitda = margenOperacional - adminActual - pagoCOO;

  // 5. MARGEN NETO / UTILIDAD
  const impuestos = ebitda * 0.05; // 5% provisión tributaria DIAN
  const utilidadNeta = ebitda - impuestos;



  // Colchón de Seguridad (20% de la Utilidad Neta)
  const metaAhorro = utilidadNeta > 0 ? utilidadNeta * 0.20 : 0;
  
  // Fondo de Crecimiento / Pauta (30% de la Utilidad Neta)
  const fondoCrecimiento = utilidadNeta > 0 ? utilidadNeta * 0.30 : 0;
  
  // Utilidad a Repartir (50% de la Utilidad Neta)
  const utilidadRepartible = utilidadNeta > 0 ? utilidadNeta * 0.50 : 0;

  // CFO Diagnosis Engine
  const getCFODiagnosis = () => {
    let mbPct = ingresosReales > 0 ? (margenBruto / ingresosReales) : 0;
    let moPct = ingresosReales > 0 ? (margenOperacional / ingresosReales) : 0;
    let netoPct = ingresosReales > 0 ? (utilidadNeta / ingresosReales) : 0;
    
    if (netoPct < 0) return { title: "ESTADO CRÍTICO", text: "La operación está perdiendo dinero. Frena el escalamiento inmediatamente. El CAC en Meta Ads o el flete se comieron toda la utilidad.", color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/20" };
    if (netoPct < 0.10) {
      if (moPct < 0.25) return { title: "ZONA DE RIESGO", text: "Eres rentable pero el margen es muy delgado (<10%). Tu pauta en Meta Ads está costosa. Optimiza tus creativos para bajar el CAC.", color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/20" };
      return { title: "ZONA DE RIESGO", text: "Margen neto peligroso. Tu publicidad está sana, el problema está en los costos logísticos o fijos. Revisa devoluciones.", color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/20" };
    }
    if (mbPct >= 0.50 && moPct >= 0.25) return { title: "OPERACIÓN SALUDABLE", text: "El negocio tiene un excelente equilibrio. El margen de producto es sano y el costo de adquisición (CAC) está controlado. ¡Escala presupuesto en Ads con confianza!", color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
    if (mbPct < 0.50) return { title: "CUELLO DE BOTELLA LOGÍSTICO", text: "Tu margen bruto es bajo (<50%). Estás pagando demasiado al proveedor o en fletes. Considera subir el precio de venta (AOV).", color: "text-orange-600", bg: "bg-orange-500/10", border: "border-orange-500/20" };
    if (moPct < 0.25) return { title: "CUELLO DE BOTELLA EN MARKETING", text: "El producto deja buen dinero, pero Meta Ads se está quedando con tu ganancia. Prioridad absoluta: bajar el CPA hoy mismo.", color: "text-orange-600", bg: "bg-orange-500/10", border: "border-orange-500/20" };
    
    return { title: "OPERACIÓN ESTABLE", text: "Rentabilidad por encima de la media. Monitorea de cerca las devoluciones para proteger este margen neto.", color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
  };

  const diagnosis = getCFODiagnosis();

  if (!loaded || !gd) return (
    <div className="p-container-padding text-on-surface">
      <h2 className="font-display-lg text-[32px] leading-tight font-bold text-on-surface mt-8">Inteligencia Financiera</h2>
      <p className="mt-4 text-outline font-label-mono text-label-xs uppercase flex items-center gap-2">
        <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
        Sincronizando Módulos...
      </p>
    </div>
  );

  if (role === 'VENDEDORA') {
    return (
      <div className="text-on-surface animate-fade-in pb-10">
        <h2 className="font-display-lg text-[32px] leading-tight font-bold mt-8">Tus Ganancias (Nómina Operativa)</h2>
        <p className="mt-2 text-outline text-sm">Resumen de tu desempeño y liquidación por pedidos entregados.</p>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-premium border border-outline-variant/30">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">analytics</span>
              Métricas de Desempeño
            </h3>
            <div className="space-y-4 font-label-mono text-sm">
              <div className="flex justify-between items-center">
                <span className="text-outline uppercase">Pedidos Entregados:</span>
                <span className="font-bold text-lg">{pedidosLiquidados.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-outline uppercase">Tasa de Devoluciones:</span>
                <span className={`font-bold text-lg ${hasBonus ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {(tasaDevolucionReal * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-outline uppercase">Meta de Bono:</span>
                <span className="font-bold text-tertiary">&lt; 20% devoluciones</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-premium border border-outline-variant/30 bg-primary/5">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">payments</span>
              Liquidación
            </h3>
            <div className="space-y-4 font-label-mono text-sm">
              <div className="flex justify-between items-center">
                <span className="text-outline uppercase">Tarifa Base por Entrega:</span>
                <span className="font-bold">{fmt(baseTariff)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-outline uppercase">Bono por Eficiencia:</span>
                <span className={`font-bold ${hasBonus ? 'text-emerald-400' : 'text-outline/50 line-through'}`}>
                  +{fmt(bonusTariff)}
                </span>
              </div>
              <div className="h-px w-full bg-outline-variant/50 my-2"></div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-bold text-primary uppercase text-sm">Total a Pagar:</span>
                <span className="font-bold text-primary text-2xl">{fmt(pagoCOO)}</span>
              </div>
            </div>
            {hasBonus && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-400 text-sm font-bold">
                <span className="material-symbols-outlined">workspace_premium</span>
                ¡Felicitaciones! Alcanzaste el bono de eficiencia.
              </div>
            )}
            {!hasBonus && (
              <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg flex flex-col gap-1 text-orange-400 text-xs">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span className="material-symbols-outlined text-base">warning</span>
                  Bono no alcanzado
                </div>
                Baja tu tasa de devoluciones a menos del 20% gestionando rápido las Novedades para ganar $500 extras por paquete.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* System Status Header & Global Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-8 mb-6 bg-surface-container-low p-4 rounded-premium border border-outline-variant shadow-sm">
        <div className="flex items-center gap-3 mb-4 sm:mb-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold tracking-wider font-label-mono uppercase">Sincronización en vivo</span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant hidden md:flex">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <span suppressHydrationWarning className="text-label-sm font-label-mono font-bold">Comité {new Intl.DateTimeFormat('es-CO', { weekday: 'long', hour: 'numeric', minute: 'numeric' }).format(new Date()).toUpperCase()}</span>
          </div>
        </div>

        {/* Global Dashboard Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-surface-container p-1 rounded-lg">
            {['Total', 'Mensual', 'Semanal', 'Diario'].map(tf => (
              <button
                key={tf}
                onClick={() => { setTimeFrame(tf); setSelectedPeriod('Total'); }}
                className={`px-3 py-1.5 rounded-md text-[11px] font-label-mono uppercase tracking-wider transition-all ${
                  timeFrame === tf ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {timeFrame !== 'Total' && (
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-surface border border-outline-variant text-on-surface text-label-sm font-label-mono rounded px-3 py-1.5 outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="Total">Todos ({timeFrame})</option>
              {crossData.map(d => (
                <option key={d.key} value={d.key}>{d.key}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2">
            <input 
              type="number"
              value={gastoAdmin}
              onChange={e => setGastoAdmin(e.target.value)}
              placeholder="Fijos Admin"
              className="bg-surface border border-outline-variant text-label-xs font-label-mono text-on-surface w-28 px-3 py-1.5 rounded-lg focus:border-primary outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Layer 1: P&L KPIs - 5 Márgenes */}
      <div className="mt-8 mb-4">
        {isProjected ? (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded w-fit">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <span className="text-[11px] font-label-mono uppercase tracking-wider">
              Modo Escudo CFO: Operación en tránsito. Simulando el peor escenario (20% devoluciones) para proteger la caja.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded w-fit">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span className="text-[11px] font-label-mono uppercase tracking-wider">
              Modo Auditoría Real: Datos maduros. Rentabilidad exacta basada en entregas y devoluciones confirmadas.
            </span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter">
        {/* 1. Ingresos */}
        <div className="glass-card p-5 rounded-premium flex flex-col justify-between h-40">
          <div>
            <p className="text-outline font-label-mono text-label-xs uppercase">1. Ingresos a Wallet</p>
            <h3 className="text-[28px] font-display-lg font-bold text-on-surface mt-1">{fmt(ingresosReales)}</h3>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-secondary text-label-xs font-bold font-label-mono">100% Base</span>
            <div className="w-16 h-8 bg-surface-container-highest rounded border-b-2 border-outline"></div>
          </div>
        </div>
        
        {/* 2. Margen Bruto */}
        <div className="glass-card p-5 rounded-premium flex flex-col justify-between h-40 relative group">
          <div>
            <div className="flex justify-between items-start">
              <p className="text-on-surface-variant font-label-mono text-label-xs uppercase">2. Margen Bruto</p>
              {(margenBruto/ingresosReales) < 0.50 && (
                <span className="px-1.5 py-0.5 bg-red-500/10 text-red-600 border border-red-500/20 font-label-mono text-[9px] rounded uppercase flex items-center gap-1">
                  ALERTA: COSTOS
                </span>
              )}
            </div>
            <h3 className="text-[28px] font-display-lg font-bold text-on-surface mt-1">{fmt(margenBruto)}</h3>
            <span className="text-[9px] font-label-mono text-on-surface-variant">Target: &gt;50% | Flete: ~15%</span>
          </div>
          <div className="flex justify-between items-end">
            <span className={`${(margenBruto/ingresosReales) >= 0.50 ? 'text-emerald-600' : 'text-red-600'} text-label-xs font-bold font-label-mono`}>
              {pct(margenBruto, ingresosReales)}
            </span>
            <div className="w-16 h-8 bg-secondary/10 rounded border-b-2 border-secondary/40"></div>
          </div>
        </div>

        {/* 3. Margen Operacional & Meta Ads */}
        <div className="glass-card p-5 rounded-premium flex flex-col justify-between h-40 relative group">
          <div>
            <div className="flex justify-between items-start">
              <p className="text-on-surface-variant font-label-mono text-label-xs uppercase">3. Margen Operacional</p>
              <div className="flex gap-1">
                {(margenOperacional/ingresosReales) < 0.25 && (
                  <span className="px-1.5 py-0.5 bg-red-500/10 text-red-600 border border-red-500/20 font-label-mono text-[9px] rounded uppercase flex items-center gap-1">
                    ALERTA: PAUTA
                  </span>
                )}
                {metaData?.spend > 0 && (
                  <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 font-label-mono text-[9px] rounded uppercase flex items-center gap-1">
                    Meta Ads
                  </span>
                )}
              </div>
            </div>
            <h3 className="text-[28px] font-display-lg font-bold text-on-surface mt-1">{fmt(margenOperacional)}</h3>
            
            {metaData?.spend > 0 ? (
              <div className="flex gap-3 mt-1">
                <span className="text-[9px] font-label-mono text-on-surface-variant">ROAS: <span className="text-on-surface font-bold">{funnelRealRoas.toFixed(2)}x</span></span>
                <span className="text-[9px] font-label-mono text-on-surface-variant">CPA: <span className="text-on-surface font-bold">{fmt(funnelRealCpa)}</span></span>
                <span className="text-[9px] font-label-mono text-on-surface-variant">CAC: <span className="text-on-surface font-bold">{fmt(funnelRealCac)}</span></span>
              </div>
            ) : (
              <span className="text-[9px] font-label-mono text-on-surface-variant">Target Mktg: {fmt(pautaMetaSug)} (35%)</span>
            )}
          </div>
          <div className="flex justify-between items-end mt-2">
            <span className={`${(margenOperacional/ingresosReales) >= 0.25 ? 'text-emerald-600' : 'text-red-600'} text-label-xs font-bold font-label-mono`}>
              {pct(margenOperacional, ingresosReales)}
            </span>
            <div className="w-16 h-8 bg-primary/10 rounded border-b-2 border-primary/40"></div>
          </div>
        </div>

        {/* 4. EBITDA / Admin */}
        <div className="glass-card p-5 rounded-premium flex flex-col justify-between h-40 relative group">
          <div>
            <div className="flex justify-between items-start">
              <p className="text-on-surface-variant font-label-mono text-label-xs uppercase">4. Costos Admin / EBITDA</p>
              {(ebitda/ingresosReales) < 0.15 && (
                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 font-label-mono text-[9px] rounded uppercase flex items-center gap-1">
                  VIGILAR FIJOS
                </span>
              )}
            </div>
            <h3 className="text-[28px] font-display-lg font-bold text-on-surface mt-1">{fmt(ebitda)}</h3>
            <div className="flex gap-3 mt-1">
              <span className="text-[9px] font-label-mono text-on-surface-variant">Fijos: <span className="text-on-surface font-bold">{fmt(adminActual)}</span></span>
              <span className="text-[9px] font-label-mono text-on-surface-variant">Nómina: <span className="text-emerald-600 font-bold">{fmt(pagoCOO)}</span></span>
            </div>
          </div>
          <div className="flex justify-between items-end">
            <span className={`${(ebitda/ingresosReales) >= 0.15 ? 'text-emerald-600' : 'text-amber-600'} text-label-xs font-bold font-label-mono`}>
              {pct(ebitda, ingresosReales)}
            </span>
            <div className="w-16 h-8 bg-secondary/10 rounded border-b-2 border-secondary/40"></div>
          </div>
        </div>

        {/* 5. Utilidad / Profit */}
        <div className="glass-card p-5 rounded-premium flex flex-col justify-between h-40 border-[#14B8A6]/20 bg-gradient-to-br from-[#14B8A6]/5 to-[#14B8A6]/10">
          <div>
            <div className="flex justify-between items-start">
              <p className="text-primary font-label-mono text-label-xs uppercase font-bold">5. Margen Neto (Profit)</p>
              {(utilidadNeta/ingresosReales) < 0.10 && (
                <span className="px-1.5 py-0.5 bg-red-500/10 text-red-600 border border-red-500/20 font-label-mono text-[9px] rounded uppercase flex items-center gap-1 animate-pulse">
                  CRÍTICO: NEGOCIO
                </span>
              )}
            </div>
            <h3 className={`text-[28px] font-display-lg font-bold mt-1 ${utilidadNeta >= 0 ? 'text-on-surface' : 'text-error'}`}>
              {fmt(utilidadNeta)}
            </h3>
            <span className="text-[9px] font-label-mono text-on-surface-variant">Target de Negocio: &gt;15%</span>
          </div>
          <div className="flex justify-between items-end">
            <span className={`${(utilidadNeta/ingresosReales) >= 0.15 ? 'text-emerald-600' : 'text-red-600'} text-label-xs font-bold font-label-mono`}>
              {pct(utilidadNeta, ingresosReales)}
            </span>
            <div className="w-16 h-8 bg-primary/20 rounded border-b-2 border-primary/60"></div>
          </div>
        </div>
      </div>

      {/* Panels: CFO Diagnosis & Liquidación Socios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mt-6">
        {/* CFO Diagnosis Panel */}
        <div className={`col-span-1 lg:col-span-2 p-4 rounded-premium border ${diagnosis.border} ${diagnosis.bg} flex items-start gap-4`}>
          <div className="hidden sm:flex h-10 w-10 rounded-full bg-surface-container flex-shrink-0 items-center justify-center">
            <svg className={`w-5 h-5 ${diagnosis.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <h4 className={`font-label-mono font-bold text-[11px] uppercase tracking-wider ${diagnosis.color} mb-1`}>
              Diagnóstico CFO IA: {diagnosis.title}
            </h4>
            <p className="text-on-surface-variant text-body-sm leading-relaxed">
              {diagnosis.text}
            </p>
          </div>
        </div>

        {/* CFO Cash Flow Distribution & Liquidación */}
        <div className="col-span-1 p-4 rounded-premium border border-outline-variant bg-surface-container-low flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5 text-on-surface-variant">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.43-2.81 3.11-3.14V4h2.67v1.93c1.38.24 2.84 1.05 3.03 2.9h-1.96c-.1-1.11-.8-1.76-2.4-1.76-1.56 0-2.31.78-2.31 1.5 0 .81.61 1.34 2.76 1.91 2.92.74 4.09 1.86 4.09 3.8 0 2.05-1.51 3.26-3.21 3.61z"/></svg>
          </div>
          <h4 className="font-label-mono font-bold text-[11px] uppercase tracking-wider text-on-surface-variant mb-3 relative z-10 flex items-center justify-between">
            <span>Liquidación Operativa & CEO</span>
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[8px] border border-primary/20 font-bold">Regla 20/30/50</span>
          </h4>
 
          {/* Nómina Operativa */}
          <div className="mb-4 pb-3 border-b border-outline-variant relative z-10">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-label-mono text-on-surface-variant uppercase flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Nómina Operativa (COO)</span>
              <span className="text-label-sm font-bold text-emerald-600">{fmt(pagoCOO)}</span>
            </div>
            <div className="space-y-1 ml-3 mt-2">
              <div className="flex justify-between items-center text-[9px] font-label-mono text-on-surface-variant">
                <span>Tarifa Base: {pedidosLiquidados.toFixed(0)} x {fmt(baseTariff)}</span>
                <span>{fmt(pedidosLiquidados * baseTariff)}</span>
              </div>
              <div className="flex justify-between items-center text-[9px] font-label-mono text-on-surface-variant">
                <span>Bono Eficiencia (&lt;20% Dev):</span>
                <span className={hasBonus ? 'text-emerald-600 font-bold' : 'line-through opacity-45'}>{fmt(pedidosLiquidados * bonusTariff)}</span>
              </div>
            </div>
          </div>
          
          {/* Distribución Financiera */}
          <div className="space-y-1.5 relative z-10 mb-3 pb-3 border-b border-outline-variant">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-label-mono text-on-surface-variant uppercase flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[#820ad1] rounded-full"></span> Colchón Empresarial (20%)</span>
              <span className="text-label-sm font-bold text-on-surface">{fmt(metaAhorro)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-label-mono text-on-surface-variant uppercase flex items-center gap-1"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Reinversión / Escala (30%)</span>
              <span className="text-label-sm font-bold text-amber-600">{fmt(fondoCrecimiento)}</span>
            </div>
          </div>
 
          <div className="flex justify-between items-center relative z-10 bg-primary/10 p-2 rounded border border-primary/20">
            <span className="text-[11px] font-label-mono text-primary uppercase font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">stars</span> Dividendo CEO (50%)
            </span>
            <span className="text-label-md font-bold text-primary">{fmt(utilidadRepartible)}</span>
          </div>
        </div>
      </div>

      {/* CFO Wallet Reconciliation Audit */}
      <div className="mt-6 glass-card rounded-premium p-6 border border-primary/20 bg-gradient-to-r from-surface-container to-surface-container-high relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          
          <div className="flex-1 w-full">
            <h4 className="font-label-mono font-bold text-[11px] uppercase tracking-wider text-primary mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
              Auditoría de Flujo de Caja (Wallet Dropi)
            </h4>
            <p className="text-on-surface-variant text-sm mb-4">
              Conciliación entre la liquidación de la plataforma y tus obligaciones reales externas.
            </p>
            
            <div className="flex items-center gap-4 bg-surface-container-lowest p-3 rounded-lg border border-outline/10">
              <div className="w-12 h-12 bg-[#820ad1]/20 rounded-full flex items-center justify-center text-[#820ad1]">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <div>
                <span className="text-[10px] font-label-mono uppercase text-outline">Disponible en Dropi (Ganancia)</span>
                <div className="text-xl font-bold text-on-surface">
                  {fmt(isProjected ? margenBruto : stats.ganancia)}
                </div>
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center justify-center px-4">
            <span className="material-symbols-outlined text-outline-variant text-3xl">remove</span>
          </div>

          <div className="flex-1 w-full bg-surface-container p-4 rounded-xl border border-error/20">
            <span className="text-[10px] font-label-mono uppercase text-error mb-2 block font-bold">Fugas Fuera de Dropi (Pagos Pendientes)</span>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-outline flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">campaign</span> Meta Ads</span>
                <span className="font-mono text-error">-{fmt(pautaActual)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-outline flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">engineering</span> Nómina (COO)</span>
                <span className="font-mono text-error">-{fmt(pagoCOO)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-outline flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">dns</span> Software (Fijo)</span>
                <span className="font-mono text-error">-{fmt(adminActual)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-outline/10">
                <span className="text-outline font-bold">Total Fugas a Cubrir</span>
                <span className="font-mono font-bold text-error">-{fmt(pautaActual + pagoCOO + adminActual)}</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center justify-center px-4">
            <span className="material-symbols-outlined text-outline-variant text-3xl">drag_handle</span>
          </div>

          <div className="flex-1 w-full bg-primary/10 p-4 rounded-xl border border-primary/30 flex flex-col justify-center">
            <span className="text-[10px] font-label-mono uppercase text-primary mb-1 block font-bold">Utilidad Real (Libre DIAN)</span>
            <div className={`text-3xl font-display-lg font-bold ${utilidadNeta >= 0 ? 'text-emerald-400' : 'text-error'} mb-1`}>
              {fmt(utilidadNeta)}
            </div>
            <span className="text-xs text-outline font-label-mono">
              {(isProjected ? margenBruto : stats.ganancia) - (pautaActual + pagoCOO + adminActual) - impuestos >= 0 ? 'Flujo Positivo' : 'Déficit de Caja'}
            </span>
          </div>
          
        </div>
      </div>

      {/* Layer 2: Conversion Funnel (Asymmetric Bento) */}
      <div className="grid grid-cols-12 gap-gutter mt-8">
        <div className="col-span-12 lg:col-span-8 glass-card rounded-premium p-6 overflow-hidden relative">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="font-headline-sm text-[20px] font-bold text-on-surface">Embudo de Conversión</h4>
              <p className="text-on-surface-variant text-body-md">Rendimiento operativo: {selectedPeriod !== 'Total' ? selectedPeriod : 'Histórico Global'}</p>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 h-48 relative z-10">
            {/* Step 1: Inversión (Spend) */}
            <div className="flex-1 flex flex-col items-center group relative">
              <div className="w-full bg-surface-container-highest rounded-t-lg relative transition-all group-hover:bg-primary/20 border-t border-x border-primary/10" style={{ height: '100%' }}>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-primary/10 rounded-t-lg"></div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-label-mono text-label-xs font-bold text-primary">{fmt(funnelSpend)}</div>
              </div>
              <span className="mt-2 font-label-mono text-label-xs uppercase text-outline">Pauta</span>
            </div>
            
            {/* Step 2: Pedidos Generados */}
            <div className="flex-1 flex flex-col items-center group relative">
              <div className="w-full bg-surface-container-highest rounded-t-lg relative transition-all group-hover:bg-secondary/20 border-t border-x border-secondary/10" style={{ height: '80%' }}>
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/40 to-secondary/10 rounded-t-lg"></div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-label-mono text-label-xs font-bold text-secondary">{funnelOrders}</div>
              </div>
              <span className="mt-2 font-label-mono text-label-xs uppercase text-outline">Pedidos</span>
            </div>

            {/* Step 3: Confirmados */}
            <div className="flex-1 flex flex-col items-center group relative">
              <div className="w-full bg-surface-container-highest rounded-t-lg relative transition-all group-hover:bg-tertiary/20 border-t border-x border-tertiary/10" style={{ height: `${funnelOrders > 0 ? (funnelConfirmed / funnelOrders) * 80 : 0}%`, minHeight: '15%' }}>
                <div className="absolute inset-0 bg-gradient-to-t from-tertiary/60 to-tertiary/20 rounded-t-lg"></div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-label-mono text-label-xs font-bold text-tertiary">{funnelConfirmed}</div>
                <div className="absolute inset-x-0 bottom-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-tertiary">{funnelOrders > 0 ? ((funnelConfirmed/funnelOrders)*100).toFixed(0) : 0}%</span>
                </div>
              </div>
              <span className="mt-2 font-label-mono text-label-xs uppercase text-outline">Confirmado</span>
            </div>

            {/* Step 4: Entregados */}
            <div className="flex-1 flex flex-col items-center group relative">
              <div className="w-full bg-surface-container-highest rounded-t-lg relative transition-all group-hover:bg-emerald-500/20 border-t border-x border-emerald-500/10" style={{ height: `${funnelConfirmed > 0 ? (funnelDelivered / funnelConfirmed) * ((funnelConfirmed/funnelOrders)*80) : 0}%`, minHeight: '10%' }}>
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/60 to-emerald-500/20 rounded-t-lg"></div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-label-mono text-label-xs font-bold text-emerald-400">{funnelDelivered}</div>
                <div className="absolute inset-x-0 bottom-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-emerald-400">{funnelOrders > 0 ? ((funnelDelivered/funnelOrders)*100).toFixed(0) : 0}%</span>
                </div>
              </div>
              <span className="mt-2 font-label-mono text-label-xs uppercase text-outline">Entregado</span>
            </div>
          </div>

          {/* Funnel Metrics Row */}
          <div className="grid grid-cols-4 gap-4 mt-6 border-t border-outline/10 pt-6">
            <div className="flex flex-col items-center text-center">
              <span className="text-[10px] font-label-mono text-outline uppercase tracking-wider">CPA (Pauta/Pedidos)</span>
              <span className="font-bold text-on-surface mt-1">{fmt(funnelRealCpa)}</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="text-[10px] font-label-mono text-outline uppercase tracking-wider">CAC (Pauta/Efectivos)</span>
              <span className="font-bold text-on-surface mt-1">{fmt(funnelRealCac)}</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="text-[10px] font-label-mono text-outline uppercase tracking-wider">ROAS</span>
              <span className={`font-bold mt-1 ${funnelRealRoas > 2 ? 'text-emerald-400' : 'text-yellow-400'}`}>{funnelRealRoas.toFixed(2)}x</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="text-[10px] font-label-mono text-outline uppercase tracking-wider">Conversión Base</span>
              <span className="font-bold text-on-surface mt-1">{funnelOrders > 0 ? ((funnelDelivered/funnelOrders)*100).toFixed(1) : 0}%</span>
            </div>
          </div>
        </div>

        {/* Savings Meta Card */}
        <div className="col-span-12 lg:col-span-4 glass-card rounded-premium p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <span className="material-symbols-outlined text-8xl">account_balance</span>
          </div>
          <div className="relative z-10">
            <h4 className="font-headline-sm text-[20px] font-bold text-on-surface">Colchón de Seguridad</h4>
            <p className="text-on-surface-variant text-body-md mb-2">Meta: 20% de la Utilidad Neta</p>
            <div className="inline-flex mb-6 items-center gap-1.5 px-2 py-0.5 bg-tertiary/10 border border-tertiary/20 rounded text-[9px] font-label-mono text-tertiary uppercase">
              <span className="material-symbols-outlined text-[10px]">monitoring</span>
              Target: &gt; 3x Inflación
            </div>
            
            <div className="text-[32px] font-display-lg font-bold text-on-surface mb-2">
              {fmt(metaAhorro)}
            </div>
            <p className="text-outline text-xs mb-8">Reserva sugerida para contingencias</p>

            <div className="space-y-5 mt-6">
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="font-label-mono text-label-xs text-on-surface uppercase flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#820ad1] rounded-full animate-pulse"></span> Cajita Nubank
                  </span>
                  <span className="text-[#820ad1] font-bold text-body-md">13% E.A.</span>
                </div>
                <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#820ad1]/50 to-[#820ad1] w-[100%]"></div>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-outline">Destino único del fondo</span>
                  <span className="text-[10px] text-[#820ad1] font-bold">100% Asignación</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-outline-variant/50">
              <p className="text-[10px] font-label-mono text-outline uppercase leading-relaxed">
                <strong className="text-on-surface-variant">Regla CFO:</strong> Retira este 20% mensualmente hacia las cuentas de neo-bancos. Usar solo en emergencias (Bloqueos de Meta o Devoluciones masivas).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Layer 3: Inteligencia de Adquisición Real (Dropi x Meta) */}
      <div className="mt-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h4 className="font-headline-sm text-[20px] font-bold text-on-surface">Inteligencia de Marketing Real</h4>
            <p className="text-on-surface-variant text-body-md">Cruce exacto entre Inversión Meta Ads y Despachos Dropi</p>
          </div>
          <div className="flex bg-surface-container-high rounded p-1">
            {['Total', 'Mensual', 'Semanal', 'Diario'].map(t => (
              <button 
                key={t}
                onClick={() => setTimeFrame(t)}
                className={`px-4 py-1.5 rounded text-label-sm font-label-mono transition-colors ${timeFrame === t ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container-highest'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {crossData.map((row, i) => (
            <div key={i} className="glass-card rounded-premium p-5 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4 w-48">
                <div className="w-10 h-10 rounded bg-[#14B8A6]/10 flex items-center justify-center text-[#14B8A6] font-bold">
                  {row.key === 'Total' ? 'Σ' : row.key.split('-').pop()}
                </div>
                <div>
                  <div className="text-label-xs font-label-mono text-on-surface-variant uppercase">{timeFrame}</div>
                  <div className="text-body-lg font-bold text-on-surface">{row.key}</div>
                </div>
              </div>
              
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-[10px] font-label-mono text-on-surface-variant mb-1">Gasto Meta</div>
                  <div className="text-lg font-bold text-red-600">{fmt(row.spend)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-label-mono text-on-surface-variant mb-1">CPA Real (Costo/Pedido)</div>
                  <div className="text-lg font-bold text-amber-600">{fmt(row.realCpa)}</div>
                  <div className="text-[9px] text-on-surface-variant">{row.orders} leads/pedidos</div>
                </div>
                <div>
                  <div className="text-[10px] font-label-mono text-on-surface-variant mb-1">
                    {row.delivered === 0 && row.confirmed > 0 ? 'CAC Proyectado (Confirmados)' : 'CAC Real (Costo/Entregado)'}
                  </div>
                  <div className="text-lg font-bold text-emerald-600">{fmt(row.realCac)}</div>
                  <div className="text-[9px] text-on-surface-variant">
                    {row.delivered === 0 && row.confirmed > 0 ? `${row.confirmed} confirmados` : `${row.delivered} entregados`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-label-mono text-on-surface-variant mb-1">ROAS Proyectado (Dropi/Meta)</div>
                  <div className="text-lg font-bold text-primary">{row.realRoas.toFixed(2)}x</div>
                  <div className="text-[9px] text-on-surface-variant">Rev: {fmt(row.roasBase)}</div>
                </div>
              </div>
            </div>
          ))}
          {crossData.length === 0 && (
            <div className="text-center p-8 text-on-surface-variant text-label-md font-label-mono">
              Sube tu Excel de Dropi para cruzar la data con Meta.
            </div>
          )}
        </div>
      </div>

    </>
  );
}
