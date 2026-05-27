"use client";
import { useEffect, useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import EmptyState from '@/components/EmptyState';

const fmt = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
const pct = v => v > 0 ? v.toFixed(2) + '%' : '0.00%';

export default function MetaAdsPage() {
  const { loaded, data: gd, role, dateFilter, customDateStart, customDateEnd } = useData();
  
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calcular fechas exactas para la API de Meta
  const apiParams = useMemo(() => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (dateFilter === 'today') {
      const tStr = formatDate(today);
      return `since=${tStr}&until=${tStr}`;
    }
    if (dateFilter === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const yStr = formatDate(yest);
      return `since=${yStr}&until=${yStr}`;
    }
    if (dateFilter === 'this_week') {
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      return `since=${formatDate(monday)}&until=${formatDate(today)}`;
    }
    if (dateFilter === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return `since=${formatDate(firstDay)}&until=${formatDate(today)}`;
    }
    if (dateFilter === 'custom' && customDateStart && customDateEnd) {
      return `since=${customDateStart}&until=${customDateEnd}`;
    }
    return 'date_preset=maximum';
  }, [dateFilter, customDateStart, customDateEnd]);

  useEffect(() => {
    if (!loaded) return;

    async function fetchCampaigns() {
      setLoading(true);
      try {
        const res = await fetch(`/api/meta/campaigns?${apiParams}`);
        const result = await res.json();
        
        if (!res.ok) throw new Error(result.error || 'Error al obtener campañas');
        
        setCampaigns(result.campaigns || []);
        setError(null);
      } catch (err) {
        console.error('Error in Meta campaigns:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCampaigns();
  }, [loaded, apiParams]);

  if (!loaded || !gd) return <EmptyState title="Módulo Meta Ads" description="Sincronizando el OS..." />;

  if (role === 'VENDEDORA') {
    return (
      <div className="p-container-padding text-on-surface">
        <h2 className="font-display-lg text-[32px] leading-tight font-bold text-error mt-8">Acceso Restringido</h2>
        <p className="mt-4 text-outline font-label-mono text-label-xs uppercase">Solo para roles directivos.</p>
      </div>
    );
  }

  // KPIs agregados de las campañas filtradas
  const summary = campaigns.reduce((acc, curr) => {
    acc.spend += curr.spend || 0;
    acc.impressions += curr.impressions || 0;
    acc.clicks += curr.clicks || 0;
    acc.purchases += curr.purchases || 0;
    acc.conversations += curr.conversations || 0;
    acc.primaryConversions += curr.primaryConversions || 0;
    acc.purchaseValue += curr.purchaseValue || 0;
    return acc;
  }, { spend: 0, impressions: 0, clicks: 0, purchases: 0, conversations: 0, primaryConversions: 0, purchaseValue: 0 });

  const totalRoas = summary.spend > 0 ? summary.purchaseValue / summary.spend : 0;
  const totalCpa = summary.primaryConversions > 0 ? summary.spend / summary.primaryConversions : 0;
  const totalCtr = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0;
  const totalCpc = summary.clicks > 0 ? summary.spend / summary.clicks : 0;

  const targetBe = gd.stats?.roasBreakEven || 2.2; // Fallback al break-even calculado

  // Formatear el ROAS color y subtext según si es campaña de chat predominantemente
  const isGlobalMsgCampaign = summary.conversations > 0 && summary.purchases === 0;
  const roasColor = totalRoas >= targetBe 
    ? 'text-emerald-600 font-bold' 
    : isGlobalMsgCampaign
      ? 'text-on-surface-variant font-medium' 
      : 'text-rose-600 font-bold';
  const roasSubText = isGlobalMsgCampaign
    ? 'Campañas de Chat / WA'
    : `Meta BE: ${targetBe.toFixed(2)}x`;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="flex justify-between items-end border-b border-outline-variant pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">ads_click</span>
            Auditoría de Meta Ads
          </h1>
          <p className="text-on-surface-variant text-sm mt-0.5">Mapeo de campañas, presupuestos y conversiones en vivo</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20">
          <span className="text-[10px] font-bold tracking-wider font-label-mono uppercase">Conectado a Graph API</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-outline">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-label-mono text-sm uppercase">Cargando métricas de Meta Ads...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-error/10 border border-error/20 rounded-premium text-error">
          <h3 className="font-bold flex items-center gap-2">
            <span className="material-symbols-outlined">warning</span>
            Error de Conexión
          </h3>
          <p className="text-sm mt-2">{error}</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center p-20 border border-outline-variant bg-surface-container-low rounded-2xl">
          <span className="material-symbols-outlined text-6xl text-outline mb-4">campaign</span>
          <p className="text-on-surface-variant font-bold">No se encontraron campañas activas con gasto en este periodo.</p>
          <p className="text-outline text-xs mt-1">Revisa el filtro de fecha arriba o tus anuncios en Meta.</p>
        </div>
      ) : (
        <>
          {/* Tarjetas KPI de la Cuenta */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Gasto Publicitario', val: fmt(summary.spend), sub: 'Meta Ads total', color: 'text-red-600' },
              { 
                label: 'Conversiones / Chats', 
                val: summary.primaryConversions.toLocaleString(), 
                sub: `${summary.conversations} chats / ${summary.purchases} compras`, 
                color: 'text-primary' 
              },
              { 
                label: 'Costo por Conversación', 
                val: fmt(totalCpa), 
                sub: isGlobalMsgCampaign ? 'Costo por chat promedio' : 'Costo por compra / lead', 
                color: 'text-orange-600' 
              },
              { label: 'CTR Promedio', val: pct(totalCtr), sub: `CPC medio: ${fmt(totalCpc)}`, color: 'text-indigo-600' },
              { label: 'ROAS del Pixel', val: isGlobalMsgCampaign ? '—' : `${totalRoas.toFixed(2)}x`, sub: roasSubText, color: roasColor },
            ].map(k => (
              <div key={k.label} className="glass-card rounded-premium p-5 flex flex-col justify-between">
                <div className="text-xs text-on-surface-variant font-semibold mb-2">{k.label}</div>
                <div className={`text-2xl font-black ${k.color} mt-1`}>{k.val}</div>
                <div className="text-[10px] text-outline mt-2 font-mono uppercase">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Tabla de Campañas */}
          <div className="glass-card rounded-premium p-6 overflow-x-auto shadow-sm">
            <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-secondary">list_alt</span>
              Rendimiento por Campaña
            </h3>
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase tracking-wider text-on-surface-variant border-b border-outline-variant">
                <tr>
                  <th className="pb-3">Campaña</th>
                  <th className="pb-3 text-right">Gasto</th>
                  <th className="pb-3 text-right">Impresiones / Clics</th>
                  <th className="pb-3 text-right">CTR / CPC</th>
                  <th className="pb-3 text-right">Conversiones / Chats</th>
                  <th className="pb-3 text-right">Costo / Conv. (CPA)</th>
                  <th className="pb-3 text-right">ROAS (Pixel)</th>
                  <th className="pb-3 text-center">Decisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {campaigns.map((c, i) => {
                  const isMsgCampaign = c.conversations > 0;
                  
                  let decision = { label: '🟡 Sin Conversión', style: 'bg-surface-container text-on-surface-variant border border-outline-variant' };
                  let isHealthy = false;
                  let isRisk = false;
                  
                  if (isMsgCampaign) {
                    // Campaña por conversación
                    const targetCpaLow = 4500; // Verde <= 4500 COP
                    const targetCpaHigh = 7500; // Rojo > 7500 COP
                    
                    if (c.cpa > 0 && c.cpa <= targetCpaLow) {
                      isHealthy = true;
                      decision = { label: '🟢 Escalar', style: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' };
                    } else if (c.cpa > targetCpaLow && c.cpa <= targetCpaHigh) {
                      decision = { label: '🟡 Mantener', style: 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20' };
                    } else if (c.cpa > targetCpaHigh) {
                      isRisk = true;
                      decision = { label: '🔴 Pausar', style: 'bg-rose-500/10 text-rose-600 border border-rose-500/20' };
                    }
                  } else {
                    // Campaña por pixel
                    if (c.roas >= targetBe) {
                      isHealthy = true;
                      decision = { label: '🟢 Escalar', style: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' };
                    } else if (c.roas < targetBe && c.roas > 0) {
                      isRisk = true;
                      decision = { label: '🔴 Pausar', style: 'bg-rose-500/10 text-rose-600 border border-rose-500/20' };
                    } else {
                      decision = { label: '🟡 Sin Conversión', style: 'bg-surface-container text-on-surface-variant border border-outline-variant' };
                    }
                  }

                  return (
                    <tr key={i} className="hover:bg-surface-container/50 transition-colors group">
                      <td className="py-4 font-medium text-on-surface max-w-[250px] truncate" title={c.name}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${c.effective_status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-outline'}`} title={c.effective_status}></span>
                          {c.name}
                        </div>
                        <div className="text-[10px] text-outline font-mono mt-0.5">{c.objective || (isMsgCampaign ? 'MESSAGING' : 'CONVERSIONS')}</div>
                      </td>
                      <td className="py-4 text-right text-on-surface font-mono font-medium">{fmt(c.spend)}</td>
                      <td className="py-4 text-right text-on-surface-variant font-mono text-xs">
                        {c.impressions.toLocaleString()}
                        <div className="text-[10px] text-outline">{c.clicks.toLocaleString()} clics</div>
                      </td>
                      <td className="py-4 text-right text-on-surface-variant font-mono text-xs">
                        {pct(c.ctr)}
                        <div className="text-[10px] text-outline">{fmt(c.cpc)}</div>
                      </td>
                      <td className="py-4 text-right text-primary font-bold font-mono">
                        {c.conversations > 0 ? (
                          <div className="flex flex-col items-end">
                            <span>{c.conversations}</span>
                            <span className="text-[10px] text-outline font-normal">chats</span>
                          </div>
                        ) : c.purchases > 0 ? (
                          <div className="flex flex-col items-end">
                            <span>{c.purchases}</span>
                            <span className="text-[10px] text-outline font-normal font-sans">compras</span>
                          </div>
                        ) : c.leads > 0 ? (
                          <div className="flex flex-col items-end">
                            <span>{c.leads}</span>
                            <span className="text-[10px] text-outline font-normal font-sans">leads</span>
                          </div>
                        ) : (
                          <span className="text-outline font-normal font-sans">—</span>
                        )}
                      </td>
                      <td className="py-4 text-right text-orange-600 font-mono font-medium">
                        {c.cpa > 0 ? (
                          <div className="flex flex-col items-end">
                            <span>{fmt(c.cpa)}</span>
                            <span className="text-[10px] text-outline font-normal font-sans">
                              {c.conversations > 0 ? 'por chat' : 'por compra'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-outline font-normal font-sans">—</span>
                        )}
                      </td>
                      <td className={`py-4 text-right font-black font-mono ${
                        isMsgCampaign 
                          ? 'text-outline font-medium' 
                          : isHealthy 
                            ? 'text-emerald-600' 
                            : isRisk 
                              ? 'text-rose-600' 
                              : 'text-outline'
                      }`}>
                        {isMsgCampaign ? '—' : `${c.roas.toFixed(2)}x`}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${decision.style}`}>
                          {decision.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
