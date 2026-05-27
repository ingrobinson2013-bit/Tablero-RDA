import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const datePreset = searchParams.get('date_preset') || 'maximum'; // today, yesterday, last_7d, last_30d, etc.
  const since = searchParams.get('since');
  const until = searchParams.get('until');

  let dateQuery = `date_preset=${datePreset}`;
  if (since && until) {
    dateQuery = `time_range={"since":"${since}","until":"${until}"}`;
  }

  const token = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!token || !adAccountId) {
    return NextResponse.json({
      error: 'Meta credentials not configured',
      configured: false,
      campaigns: []
    }, { status: 200 });
  }

  try {
    // 1. Fetch campaigns metadata (status, effective_status, objective)
    const urlCampaigns = `https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns?fields=name,status,effective_status,objective&limit=100&access_token=${token}`;
    const resCampaigns = await fetch(urlCampaigns);
    const dataCampaigns = await resCampaigns.json();

    if (dataCampaigns.error) {
      throw new Error(dataCampaigns.error.message);
    }

    // 2. Fetch campaign insights (performance)
    const urlInsights = `https://graph.facebook.com/v19.0/act_${adAccountId}/insights?level=campaign&fields=campaign_id,campaign_name,spend,actions,action_values,impressions,inline_link_clicks,reach&${dateQuery}&limit=100&access_token=${token}`;
    const resInsights = await fetch(urlInsights);
    const dataInsights = await resInsights.json();

    if (dataInsights.error) {
      throw new Error(dataInsights.error.message);
    }

    const campaignsList = dataCampaigns.data || [];
    const insightsList = dataInsights.data || [];

    // Map insights by campaign_id for fast lookup
    const insightsMap = new Map();
    insightsList.forEach(insight => {
      insightsMap.set(insight.campaign_id, insight);
    });

    // Merge campaigns metadata with performance insights
    const mergedCampaigns = campaignsList.map(camp => {
      const insight = insightsMap.get(camp.id) || {};
      
      const spend = parseFloat(insight.spend) || 0;
      const impressions = parseInt(insight.impressions) || 0;
      const reach = parseInt(insight.reach) || 0;
      const clicks = parseInt(insight.inline_link_clicks) || 0;

      // Acciones de píxel (Compras/Leads) y Mensajes (Conversaciones)
      const purchaseActions = insight.actions?.find(a => a.action_type === 'omni_purchase' || a.action_type === 'purchase');
      const leadActions = insight.actions?.find(a => a.action_type === 'lead');
      
      const convActions = insight.actions?.filter(a => 
        a.action_type.includes('messaging_first_reply') || 
        a.action_type.includes('messaging_conversation_started') ||
        a.action_type.includes('messenger_conversation_started')
      ) || [];

      const purchases = purchaseActions ? parseInt(purchaseActions.value) : 0;
      const leads = leadActions ? parseInt(leadActions.value) : 0;
      const conversations = convActions.reduce((sum, a) => sum + (parseInt(a.value) || 0), 0);

      // Conversión primaria de la campaña: Priorizar conversaciones para campañas de mensajes, luego compras de pixel, luego leads
      const primaryConversions = conversations > 0 ? conversations : (purchases > 0 ? purchases : leads);

      // Valor de compra y ROAS
      const purchaseValObj = insight.action_values?.find(v => v.action_type === 'omni_purchase' || v.action_type === 'purchase');
      const purchaseValue = purchaseValObj ? parseFloat(purchaseValObj.value) : 0;
      const roas = spend > 0 ? purchaseValue / spend : 0;

      // Métricas de conversión y coste
      const cpc = clicks > 0 ? spend / clicks : 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpa = primaryConversions > 0 ? spend / primaryConversions : 0;

      return {
        id: camp.id,
        name: camp.name,
        status: camp.status,
        effective_status: camp.effective_status,
        objective: camp.objective,
        spend,
        impressions,
        reach,
        clicks,
        purchases,
        leads,
        conversations,
        primaryConversions,
        purchaseValue,
        roas,
        cpc,
        ctr,
        cpa
      };
    });

    // Filtramos para mostrar:
    // 1. Campañas activas en Meta
    // 2. O campañas inactivas que registraron gasto en el periodo seleccionado
    const filteredCampaigns = mergedCampaigns.filter(c => 
      c.effective_status === 'ACTIVE' || c.spend > 0
    );

    // Ordenamos por gasto descendente
    filteredCampaigns.sort((a, b) => b.spend - a.spend);

    return NextResponse.json({
      configured: true,
      campaigns: filteredCampaigns
    });

  } catch (error) {
    console.error('[META CAMPAIGNS API ERROR]:', error.message);
    return NextResponse.json({ error: error.message, configured: true, campaigns: [] }, { status: 500 });
  }
}
