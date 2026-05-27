// API Route — servidor Next.js
// GET /api/fetch
// Obtiene todos los registros de Supabase

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service env vars not set');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET() {
  try {
    const supabase = getServiceClient();

    // Fetch all records (bypassing 1000 limit by paginating or setting high limit)
    const { data, error } = await supabase
      .from('dropi_orders')
      .select('*')
      .limit(100000); // Suficientemente alto para empezar

    if (error) {
      console.error('[NODIA OPS API] Fetch error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get last upload timestamp
    let lastUpload = null;
    if (data && data.length > 0) {
        // Find the latest uploaded_at date
        const latest = data.reduce((latest, current) => {
            if (!current.uploaded_at) return latest;
            const currentObj = new Date(current.uploaded_at);
            return currentObj > latest ? currentObj : latest;
        }, new Date(0));
        lastUpload = latest.toISOString();
    }

    return NextResponse.json({
      records: data || [],
      lastUpload
    });

  } catch (err) {
    console.error('[NODIA OPS API] Fetch Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
