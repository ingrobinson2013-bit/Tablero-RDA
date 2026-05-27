// API Route — servidor Next.js (NO expuesto al browser)
// Usa SUPABASE_SERVICE_ROLE_KEY para bypassear RLS
// POST /api/upload  { records: [...] }

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const BATCH_SIZE = 500;

// Cliente con service_role — solo en servidor
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service env vars not set');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request) {
  try {
    const { records, fileName } = await request.json();

    if (!records?.length) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 });
    }

    const gananciaRows = records.filter(r => r.ganancia > 0);
    console.log(`[NODIA OPS API] Recibidos ${records.length} records. Filas con ganancia > 0:`, gananciaRows.length);
    if (gananciaRows.length > 0) {
      console.log('[NODIA OPS API] Ejemplos de ganancia:', gananciaRows.slice(0, 3).map(r => ({ id: r.id, g: r.ganancia })));
    } else {
      // Log some rows to see what is happening
      console.log('[NODIA OPS API] Muestra de 5 filas (id, ganancia, estatus):', records.slice(0, 5).map(r => ({ id: r.id, ganancia: r.ganancia, estatus: r.estatus })));
    }

    const supabase = getServiceClient();
    let inserted = 0;
    const errors = [];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('dropi_orders')
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

      if (error) {
        console.error(`[NODIA OPS API] Error lote ${i}:`, error.message);
        errors.push({ batch: i, error: error.message });
      } else {
        inserted += batch.length;
      }
    }

    return NextResponse.json({
      total:    records.length,
      inserted,
      errors,
      fileName,
    });

  } catch (err) {
    console.error('[NODIA OPS API] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
