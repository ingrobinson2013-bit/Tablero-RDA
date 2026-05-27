// ============================================================
// NODIA OPS™ — uploadToSupabase.js
// Transforma filas del Excel de Dropi al schema de Supabase
// y hace upsert masivo en lotes de 500 registros
// ============================================================

import { parseValue, parseDate } from './analyzeData';

// Mapeo Excel → columna Supabase
// Tolerante a acentos y mayúsculas (igual que analyzeData.js)
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

function findHeader(headers, target) {
  const t = norm(target);
  const found = headers.find(h => norm(h) === t) || headers.find(h => norm(h).includes(t)) || null;
  if (t === 'ganancia') console.log('[NODIA OPS] Buscando:', t, 'encontrado:', found, 'en headers:', headers);
  return found;
}

// Calcular week_key ISO desde una fecha JS
function getWeekKey(jsDate) {
  if (!jsDate || isNaN(jsDate)) return null;
  const tmp = new Date(jsDate);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((tmp - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${tmp.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// Parsear fecha DD-MM-YYYY o YYYY-MM-DD → objeto Date
function parseDroiDate(raw) {
  if (!raw) return null;
  const s = String(raw).split(' ')[0].split('T')[0];
  if (s.match(/^\d{2}-\d{2}-\d{4}$/)) {
    const [d, m, y] = s.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = s.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  return null;
}

function toISO(raw) {
  const d = parseDroiDate(raw);
  if (!d || isNaN(d)) return null;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Transformar una fila del Excel → objeto para Supabase
function transformRow(row, colMap, batchName) {
  const g = (key) => colMap[key] ? String(row[colMap[key]] ?? '').trim() : '';
  const n = (key) => parseValue(colMap[key] ? row[colMap[key]] : 0);
  const d = (key) => toISO(colMap[key] ? row[colMap[key]] : '');

  const fechaReporte = d('fechaReporte') || d('fecha');
  const jsDateReporte = parseDroiDate(colMap['fechaReporte'] ? row[colMap['fechaReporte']] : '');
  const weekKey = getWeekKey(jsDateReporte);

  return {
    // Identificación
    id:                           g('id') || null,
    fecha_reporte:                fechaReporte,
    hora:                         g('hora'),
    fecha:                        d('fecha'),
    week_key:                     weekKey,

    // Cliente
    nombre_cliente:               g('cliente'),
    telefono:                     g('telefono'),
    email:                        g('email'),
    tipo_identificacion:          g('tipoIdentificacion'),
    nro_identificacion:           g('nroIdentificacion'),

    // Envío
    numero_guia:                  g('guia'),
    estatus:                      g('estatus'),
    tipo_envio:                   g('tipoEnvio'),
    departamento_destino:         g('departamento'),
    ciudad_destino:               g('ciudad'),
    direccion:                    g('direccion'),
    notas:                        g('notas'),
    transportadora:               g('transportadora'),

    // Financiero
    total_orden:                  n('totalOrden'),
    ganancia:                     (() => { const v = n('ganancia'); console.log('Parsed ganancia:', v); return v; })(),
    precio_flete:                 n('precioFlete'),
    costo_devolucion_flete:       n('costoDevolucion'),
    comision:                     n('comision'),
    pct_comision:                 n('pctComision'),
    precio_proveedor:             n('precioProveedor'),
    precio_proveedor_x_cantidad:  n('costoTotal'),

    // Producto
    producto_id:                  g('productoId'),
    sku:                          g('sku'),
    variacion_id:                 g('variacionId'),
    producto:                     g('producto'),
    variacion:                    g('variacion'),
    cantidad:                     Math.max(1, parseInt(g('cantidad')) || 1),

    // Novedad
    novedad:                      g('novedad'),
    fue_solucionada_novedad:      g('novedadSolucionada'),
    hora_novedad:                 g('horaNovedad'),
    fecha_novedad:                d('fechaNovedad'),
    solucion:                     g('solucion'),
    hora_solucion:                g('horaSolucion'),
    fecha_solucion:               d('fechaSolucion'),
    observacion:                  g('observacion'),

    // Último movimiento
    hora_ultimo_movimiento:       g('horaUltimoMovimiento'),
    fecha_ultimo_movimiento:      d('fechaUltimoMovimiento'),
    ultimo_movimiento:            g('ultimoMovimiento'),
    concepto_ultimo_movimiento:   g('conceptoMovimiento'),
    ubicacion_ultimo_movimiento:  g('ubicacionUltimoMovimiento'),

    // Tienda / Vendedor
    vendedor:                     g('vendedor'),
    tipo_tienda:                  g('tipoTienda'),
    tienda:                       g('tienda'),
    id_orden_tienda:              g('idOrdenTienda'),
    numero_pedido_tienda:         g('numeroPedidoTienda'),
    tags:                         g('tags'),

    // Guía y compensaciones
    fecha_guia_generada:          d('fechaGuia'),
    contador_indemnizaciones:     parseInt(g('contadorIndemnizaciones')) || 0,
    concepto_ultima_indemnizacion: g('conceptoUltimaIndemnizacion'),

    // Auditoría
    upload_batch:                 batchName,
  };
}

// ─── COLUMNAS DROPI ─────────────────────────────────────────────
const DROPI_COLS = {
  fechaReporte:           'fecha de reporte',
  id:                     'id',
  hora:                   'hora',
  fecha:                  'fecha',
  cliente:                'nombre cliente',
  telefono:               'telefono',
  email:                  'email',
  tipoIdentificacion:     'tipo de identificacion',
  nroIdentificacion:      'nro de identificacion',
  guia:                   'numero guia',
  estatus:                'estatus',
  tipoEnvio:              'tipo de envio',
  departamento:           'departamento destino',
  ciudad:                 'ciudad destino',
  direccion:              'direccion',
  notas:                  'notas',
  transportadora:         'transportadora',
  totalOrden:             'total de la orden',
  ganancia:               'ganancia',
  precioFlete:            'precio flete',
  costoDevolucion:        'costo devolucion flete',
  comision:               'comision',
  pctComision:            'comision de la plataformma',
  precioProveedor:        'precio proveedor',
  costoTotal:             'precio proveedor x cantidad',
  productoId:             'producto id',
  sku:                    'sku',
  variacionId:            'variacion id',
  producto:               'producto',
  variacion:              'variacion',
  cantidad:               'cantidad',
  novedad:                'novedad',
  novedadSolucionada:     'fue solucionada la novedad',
  horaNovedad:            'hora de novedad',
  fechaNovedad:           'fecha de novedad',
  solucion:               'solucion',
  horaSolucion:           'hora de solucion',
  fechaSolucion:          'fecha de solucion',
  observacion:            'observacion',
  horaUltimoMovimiento:   'hora de ultimo movimiento',
  fechaUltimoMovimiento:  'fecha de ultimo movimiento',
  ultimoMovimiento:       'ultimo movimiento',
  conceptoMovimiento:     'concepto ultimo movimiento',
  ubicacionUltimoMovimiento: 'ubicacion de ultimo movimiento',
  vendedor:               'vendedor',
  tipoTienda:             'tipo de tienda',
  tienda:                 'tienda',
  idOrdenTienda:          'id de orden de tienda',
  numeroPedidoTienda:     'numero de pedido de tienda',
  tags:                   'tags',
  fechaGuia:              'fecha guia generada',
  contadorIndemnizaciones:'contador de indemnizaciones',
  conceptoUltimaIndemnizacion: 'concepto ultima indenmnizacion',
};

// ─── EXPORT: transformRows ─────────────────────────────────────
// Convierte rawRows del Excel al formato de dropi_orders para Supabase
export function transformRows(rawRows, fileName) {
  if (!rawRows?.length) return [];
  const headers = Object.keys(rawRows[0]);

  const colMap = {};
  Object.entries(DROPI_COLS).forEach(([key, name]) => {
    colMap[key] = findHeader(headers, name);
  });

  const validRows = rawRows.filter(row => {
    const id = colMap['id'] ? String(row[colMap['id']] ?? '').trim() : '';
    return id !== '';
  });

  console.log(`[NODIA OPS] ${validRows.length} filas válidas de ${rawRows.length} totales`);
  return validRows.map(row => transformRow(row, colMap, fileName));
}

// ─── EXPORT: uploadToSupabase (uso directo con cliente supabase) ─
export async function uploadToSupabase(supabase, rawRows, fileName) {
  if (!rawRows?.length) throw new Error('No hay filas para subir');

  const records = transformRows(rawRows, fileName);
  const BATCH_SIZE = 500;
  let inserted = 0;
  const errors = [];

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('dropi_orders')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.error(`[NODIA OPS] Error en lote ${i}:`, error.message);
      errors.push({ batch: i, error: error.message });
    } else {
      inserted += batch.length;
    }
  }

  return { total: rawRows.length, valid: records.length, inserted, errors, fileName };
}
