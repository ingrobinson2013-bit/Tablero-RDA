import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const datePreset = searchParams.get('date_preset') || 'maximum'; // today, yesterday, last_7d, last_30d
  
  const token = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!token || !adAccountId) {
    return NextResponse.json({ 
      error: 'Credenciales de Meta no configuradas', 
      configured: false,
      // Retornar mocks estructurados para demostración/UI si no hay token
      data: {
        spend: 0,
        cpa: 0,
        cac: 0,
        roas: 0,
        daily: []
      }
    }, { status: 200 }); // Status 200 para no quebrar el frontend
  }

  try {
    // 1. Fetch de Insights Generales (Totales)
    const urlTotal = `https://graph.facebook.com/v19.0/act_${adAccountId}/insights?fields=spend,action_values,actions,cost_per_action_type,purchase_roas&date_preset=${datePreset}&access_token=${token}`;
    const resTotal = await fetch(urlTotal);
    const dataTotal = await resTotal.json();

    if (dataTotal.error) {
      throw new Error(dataTotal.error.message);
    }

    // 2. Fetch Insights Diarios (Para la gráfica de CAC/CPA diario)
    const urlDaily = `https://graph.facebook.com/v19.0/act_${adAccountId}/insights?fields=spend,actions,action_values&time_increment=1&date_preset=${datePreset}&access_token=${token}`;
    const resDaily = await fetch(urlDaily);
    const dataDaily = await resDaily.json();

    const summary = dataTotal.data?.[0] || {};
    
    // Extracción segura de valores
    const spend = parseFloat(summary.spend) || 0;
    
    // ROAS directamente reportado por Meta (si existe el pixel)
    const roasAction = summary.purchase_roas?.find(a => a.action_type === 'omni_purchase');
    const roas = roasAction ? parseFloat(roasAction.value) : 0;

    // Compras / Leads (Si no hay compras directas, se usa leads como fallback)
    const purchasesAction = summary.actions?.find(a => a.action_type === 'omni_purchase' || a.action_type === 'purchase');
    const leadsAction = summary.actions?.find(a => a.action_type === 'lead');
    
    const purchases = purchasesAction ? parseInt(purchasesAction.value) : 0;
    const leads = leadsAction ? parseInt(leadsAction.value) : 0;

    // Cálculos
    const cac = purchases > 0 ? spend / purchases : 0;
    const cpa = leads > 0 ? spend / leads : (purchases > 0 ? spend / purchases : 0);

    // Procesar Data Diaria
    const daily = (dataDaily.data || []).map(day => {
      const dSpend = parseFloat(day.spend) || 0;
      const dPurchases = day.actions?.find(a => a.action_type === 'omni_purchase' || a.action_type === 'purchase')?.value || 0;
      const dLeads = day.actions?.find(a => a.action_type === 'lead')?.value || 0;
      
      const dCac = dPurchases > 0 ? dSpend / dPurchases : 0;
      const dCpa = dLeads > 0 ? dSpend / dLeads : (dPurchases > 0 ? dSpend / dPurchases : 0);

      return {
        date: day.date_start,
        spend: dSpend,
        purchases: parseInt(dPurchases),
        leads: parseInt(dLeads),
        cac: dCac,
        cpa: dCpa
      };
    });

    return NextResponse.json({
      configured: true,
      data: {
        spend,
        cpa,
        cac,
        roas,
        purchases,
        leads,
        daily
      }
    });

  } catch (error) {
    console.error('[META API ERROR]:', error.message);
    return NextResponse.json({ error: error.message, configured: true }, { status: 500 });
  }
}
