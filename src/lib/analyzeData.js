
// ============================================================
// NODIA OPS — Motor de Análisis Dropi
// Columnas exactas del reporte de exportación de Dropi
// ============================================================

// Columnas exactas de Dropi (normalizadas a lowercase para búsqueda segura)
const DROPI_COLS = {
  fechaReporte:      'fecha de reporte',
  hora:              'hora',
  fecha:             'fecha',
  cliente:           'nombre cliente',
  telefono:          'teléfono',
  guia:              'número guia',
  estatus:           'estatus',
  tipoEnvio:         'tipo de envio',
  departamento:      'departamento destino',
  ciudad:            'ciudad destino',
  transportadora:    'transportadora',
  totalOrden:        'total de la orden',
  ganancia:          'ganancia',
  precioFlete:       'precio flete',
  costoDevolucion:   'costo devolucion flete',
  comision:          'comision',
  pctComision:       '% comision de la plataformma',
  precioProveedor:   'precio proveedor',
  costoTotal:        'precio proveedor x cantidad',
  productoId:        'producto id',
  sku:               'sku',
  producto:          'producto',
  variacion:         'variacion',
  cantidad:          'cantidad',
  novedad:           'novedad',
  novedadSolucionada:'fue solucionada la novedad',
  solucion:          'solución',
  observacion:       'observación',
  ultimoMovimiento:  'último movimiento',
  conceptoMovimiento:'concepto último movimiento',
  vendedor:          'vendedor',
  tienda:            'tienda',
  tags:              'tags',
  fechaGuia:         'fecha guia generada',
};

// Encuentra la columna real del header (tolerante a acentos y mayúsculas)
function findCol(headers, target) {
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const t = norm(target);
  return headers.find(h => norm(h) === t) || headers.find(h => norm(h).includes(t)) || null;
}

export function parseValue(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = val.toString()
    .replace(/[^0-9.,-]/g, '')    // Eliminar TODO lo que no sea número, punto, coma o signo menos (ej: $, COP, espacios)
    .replace(/\.(?=\d{3})/g, '')  // Remover separador de miles si usa punto (ej: 33.809,5 -> 33809,5)
    .replace(/,/g, '.');          // Convertir coma decimal a punto (ej: 33809,5 -> 33809.5)
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Clasificador de estados EXACTOS de Dropi
// Fuente: exportación real de Dropi Colombia
function classifyStatus(rawStatus) {
  const s = rawStatus.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // ─── CANCELADOS (no generan ingreso) ───────────────────────────
  const isCancelled = s === 'CANCELADO' || s.includes('ANULAD') || s.includes('RECHAZAD');

  // ─── CONFIRMADOS / EN PREPARACIÓN ─────────────────────────────
  // EN PROCESAMIENTO o ASIGNADO (ya tiene guía)
  const isConfirmed = s === 'CONFIRMADO' || s === 'PREPARADO' ||
                      s === 'EN PROCESAMIENTO' || s === 'ASIGNADO' ||
                      s === 'GUIA_GENERADA' || s === 'PREPARADO PARA TRANSPORTADORA' ||
                      s.includes('EN ALISTAMIENTO') || s.includes('LISTO PARA') ||
                      s.includes('GUIA GENERADA');

  // ─── EN BODEGA / TRÁNSITO / DESPACHADOS ───────────────────────
  // Solo se cuenta despachado cuando la transportadora lo tiene (EN BODEGA ORIGEN/DESTINO) o va en camino.
  const isDispatched = s.includes('EN BODEGA') ||          // EN BODEGA ORIGEN / COURIER / TRANSPORTADORA / DROPI
                       s === 'RECOGIDO POR DROPI' ||
                       s === 'ENTREGADO A TRANSPORTADORA' ||
                       s.includes('EN RUTA') ||
                       s.includes('DESPACHADO') ||
                       s.includes('EN TRANSITO') ||
                       s.includes('TRANSITO') ||
                       s === 'ENTREGADO' ||                // entregado al cliente también fue despachado
                       s.includes('DEVOLUCION') ||         // devuelto también fue despachado
                       s.includes('DEVUELT') ||
                       s.includes('NOVEDAD') ||            // novedad también fue despachado
                       s.includes('RECLAME') ||            // reclame en oficina
                       s.includes('OFICINA') ||
                       s === 'ADMITIDA' ||
                       s.includes('REPARTO') ||
                       s.includes('REENVIO');

  // ─── ENTREGADOS (generan ingreso real) ────────────────────────
  // MUY IMPORTANTE: Excluir 'ENTREGADO A TRANSPORTADORA' para no dar falsos positivos de ventas.
  const isDelivered = (s === 'ENTREGADO' || s.includes('ENTREGAD')) && !s.includes('TRANSPORTADORA');

  // ─── DEVUELTOS (pérdida de flete) ─────────────────────────────
  const isReturned = s === 'DEVOLUCION' || s === 'DEVUELTO' ||
                     s.includes('DEVOLUCION') || s.includes('DEVUELT');

  // ─── NOVEDADES (problema sin resolver) ────────────────────────
  const isNovedad = s === 'NOVEDAD' || (s.includes('NOVEDAD') && !s.includes('SOLUCIONA')) || s.includes('RECLAME') || s.includes('OFICINA');

  // ─── PENDIENTES (sin gestionar aún) ───────────────────────────
  const isPending = s === 'PENDIENTE' || s === 'PENDIENTE CONFIRMACION' || s.includes('SIN GESTIONAR');

  return { isCancelled, isConfirmed, isDispatched, isDelivered, isReturned, isNovedad, isPending };
}

export function analyzeData(allRows, dateFilter = 'all', customStart = '', customEnd = '') {
  if (!allRows || allRows.length === 0) return null;

  const headers = Object.keys(allRows[0]);

  // Mapear columnas reales
  const col = {};
  Object.entries(DROPI_COLS).forEach(([key, name]) => {
    col[key] = findCol(headers, name);
  });

  // Filter rows by dateFilter
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const firstDayOfWeek = new Date(today);
  firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const customStartDate = customStart ? new Date(customStart + "T00:00:00") : null;
  const customEndDate = customEnd ? new Date(customEnd + "T23:59:59") : null;

  const filteredRows = allRows.filter(row => {
    if (dateFilter === 'all') return true;
    
    // Extraer fecha tal como se hace más abajo
    const rawDate = col.fecha
      ? String(row[col.fecha] || row[col.fechaReporte] || '')
      : (col.fechaReporte ? String(row[col.fechaReporte] || '') : '');
    const cleanDate = rawDate.split(' ')[0].split('T')[0] || '';

    let rowDate = null;
    if (cleanDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [d, m, y] = cleanDate.split('-');
      rowDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    } else if (cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = cleanDate.split('-');
      rowDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
    
    if (!rowDate) return true; // Si no hay fecha parseable, lo incluimos o excluimos? Lo incluimos por defecto.
    rowDate.setHours(0,0,0,0);

    if (dateFilter === 'today') return rowDate.getTime() === today.getTime();
    if (dateFilter === 'yesterday') return rowDate.getTime() === yesterday.getTime();
    if (dateFilter === 'this_week') return rowDate >= firstDayOfWeek && rowDate <= today;
    if (dateFilter === 'this_month') return rowDate >= firstDayOfMonth && rowDate <= today;
    if (dateFilter === 'custom') {
      if (customStartDate && rowDate < customStartDate) return false;
      if (customEndDate && rowDate > customEndDate) return false;
      return true;
    }
    
    return true;
  });

  if (!filteredRows || filteredRows.length === 0) return null;

  let stats = {
    totalOrders: 0,
    confirmed: 0, cancelled: 0,
    dispatched: 0, delivered: 0,
    returned: 0, pending: 0, novedad: 0,
    // Financiero — SOLO órdenes NO canceladas
    grossRevenue: 0,      // Valor de órdenes activas (no canceladas)
    grossCogs: 0,         // Costo proveedor proyectado (no canceladas)
    grossShipping: 0,     // Fletes proyectados (no canceladas)
    grossCommissions: 0,  // Comisiones proyectadas (no canceladas)
    cancelledRevenue: 0,  // Valor de órdenes canceladas (no realizable)
    revenue: 0,           // Valor de órdenes ENTREGADAS (ingreso real)
    ganancia: 0,          // Ganancia Dropi (col GANANCIA) de entregadas
    cogs: 0,              // Costo proveedor x cantidad de entregadas
    shipping: 0,          // Fletes de entregadas
    shippingReturns: 0,   // Fletes de devoluciones (pérdida)
    commissions: 0,       // Comisiones de entregadas
    netProfit: 0,         // Utilidad neta calculada
    // Dropi Exact Mirror
    dropiSinRecaudo: 0,
    dropiConRecaudo: 0,
    dropiRecaudado: 0,
    dropiPorRecaudar: 0,
    dropiUtilidadEstimada: 0,
    // Estados Exclusivos (suman exactamente totalOrders)
    exCancelado: 0,
    exBodega: 0,
    exTransito: 0,
    exNovedad: 0,
    exEntregado: 0,
    exDevuelto: 0,
    exPending: 0,
    bodegaSLA: 0,         // Paquetes en bodega > 24h
    confirmationRate: 0,  // % de leads confirmados
  };

  let salesByDate    = {};  // { date: { date, orders, delivered, returned, revenue, ganancia } }
  let citiesData     = {};  // { city: { city, orders, confirmed, delivered, returned } }
  let deptData       = {};  // { dept: { dept, orders, delivered, returned } }
  let transportData  = {};  // { courier: { courier, orders, delivered, returned, novedad } }
  let productData    = {};  // { product: { product, sku, orders, delivered, returned, revenue, cogs } }
  let vendedorData   = {};  // { seller: { seller, orders, confirmed, delivered } }
  let novedadTypes   = {};  // { novedad: count }
  let statusCounts   = {};  // { status: count }
  let hourlyData     = {};  // { hour: { hour, orders, delivered } }

  filteredRows.forEach(row => {
    const rawStatus = col.estatus ? String(row[col.estatus] || '').trim() : '';
    if (!rawStatus) return;

    stats.totalOrders++;
    const st = classifyStatus(rawStatus);

    // Valores numéricos
    const total      = parseValue(col.totalOrden    ? row[col.totalOrden]    : 0);
    const ganancia   = parseValue(col.ganancia       ? row[col.ganancia]      : 0);
    const flete      = parseValue(col.precioFlete    ? row[col.precioFlete]   : 0);
    const devFlete   = parseValue(col.costoDevolucion? row[col.costoDevolucion]: 0);
    const comision   = parseValue(col.comision       ? row[col.comision]      : 0);
    const costoTotal = parseValue(col.costoTotal     ? row[col.costoTotal]    : 0);
    const cantidad   = parseValue(col.cantidad       ? row[col.cantidad]      : 1) || 1;

    // Metadata
    const city    = col.ciudad       ? String(row[col.ciudad]       || 'Sin Ciudad').trim()    : 'Sin Ciudad';
    const dept    = col.departamento ? String(row[col.departamento] || 'Sin Depto').trim()     : 'Sin Depto';
    const courier = col.transportadora? String(row[col.transportadora]|| 'Sin Asignar').trim() : 'Sin Asignar';
    const product = col.producto     ? String(row[col.producto]     || 'Sin Producto').trim()  : 'Sin Producto';
    const sku     = col.sku          ? String(row[col.sku]          || '').trim()               : '';
    const seller  = col.vendedor     ? String(row[col.vendedor]     || 'Sin Vendedor').trim()  : 'Sin Vendedor';
    const novedad = col.novedad      ? String(row[col.novedad]      || '').trim()               : '';

    const isSinRecaudo = col.tipoEnvio 
      ? String(row[col.tipoEnvio] || '').trim().toUpperCase().includes('SIN RECAUDO')
      : false;

    // Fecha de la orden (transaccional) — Priorizar col.fecha
    const rawDate = col.fecha
      ? String(row[col.fecha] || row[col.fechaReporte] || '')
      : (col.fechaReporte ? String(row[col.fechaReporte] || '') : '');
    const cleanDate = rawDate.split(' ')[0].split('T')[0] || '';

    // Normalizar a YYYY-MM-DD para ordenar correctamente
    let date = cleanDate;
    let jsDate = null;
    if (cleanDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
      // Formato DD-MM-YYYY (Dropi)
      const [d, m, y] = cleanDate.split('-');
      date   = `${y}-${m}-${d}`;
      jsDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    } else if (cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Formato YYYY-MM-DD
      const [y, m, d] = cleanDate.split('-');
      jsDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
    if (!date) date = 'Sin Fecha';

    // Semana ISO (Lunes como inicio)
    let weekKey = 'Sin Semana';
    if (jsDate) {
      const tmp = new Date(jsDate);
      tmp.setHours(0, 0, 0, 0);
      tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
      const week1 = new Date(tmp.getFullYear(), 0, 4);
      const weekNum = 1 + Math.round(((tmp - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
      weekKey = `${tmp.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    }

    // Hora
    const rawHora = col.hora ? String(row[col.hora] || '') : '';
    const hourNum = parseInt(rawHora.split(':')[0]);

    // ─── ACUMULACIÓN FINANCIERA ────────────────────────────────
    // Ventas brutas = SOLO órdenes NO canceladas (el valor que sí puede realizarse)
    if (!st.isCancelled) {
      stats.grossRevenue += total;
      stats.grossCogs += costoTotal;
      stats.grossShipping += flete;
      stats.grossCommissions += comision;

      // Dropi Exact Mirror
      if (isSinRecaudo) {
        stats.dropiSinRecaudo += total;
      } else {
        stats.dropiConRecaudo += total;
      }

      if (!st.isReturned) {
        stats.dropiUtilidadEstimada += (total - costoTotal - flete - comision);
      }

      if (!st.isDelivered && !st.isReturned && !isSinRecaudo) {
        stats.dropiPorRecaudar += total;
      }
    } else {
      stats.cancelledRevenue += total;  // registro separado para transparencia
    }

    if (st.isCancelled) {
      stats.cancelled++;
    } else {
      stats.confirmed++;
    }

    if (st.isDispatched || st.isDelivered || st.isReturned || st.isNovedad) {
      stats.dispatched++;
    }

    // Sumar ganancia de forma global (Dropi a veces pone estatus raros cuando concilia)
    stats.ganancia += ganancia;

    if (st.isDelivered) {
      stats.delivered++;
      stats.revenue     += total;
      stats.cogs        += costoTotal;
      stats.shipping    += flete;
      stats.commissions += comision;
      stats.netProfit   += ganancia > 0 ? ganancia : (total - costoTotal - flete - comision);

      if (!isSinRecaudo) {
        stats.dropiRecaudado += total;
      }
    }

    if (st.isReturned) {
      stats.returned++;
      stats.shippingReturns += devFlete > 0 ? devFlete : flete;
      stats.netProfit       -= devFlete > 0 ? devFlete : flete;
    }

    if (st.isNovedad) stats.novedad++;
    if (st.isPending) stats.pending++;

    // Lógica de buckets exclusivos (mutuamente excluyentes)
    if (st.isCancelled) {
      stats.exCancelado++;
    } else if (st.isDelivered) {
      stats.exEntregado++;
    } else if (st.isReturned) {
      stats.exDevuelto++;
    } else if (st.isNovedad) {
      stats.exNovedad++;
    } else if (st.isDispatched || rawStatus.includes('EN BODEGA') || rawStatus === 'ENTREGADO A TRANSPORTADORA' || rawStatus.includes('EN RUTA')) {
      stats.exTransito++;
    } else if (st.isPending) {
      stats.exPending++;
    } else {
      stats.exBodega++;
      if (jsDate) {
        const orderDate = new Date(jsDate);
        if (hourNum) orderDate.setHours(hourNum);
        const diffHours = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60);
        if (diffHours > 24) {
          stats.bodegaSLA++;
          if (!stats.delayedOrders) stats.delayedOrders = [];
          stats.delayedOrders.push({
            ...row,
            horas: Math.floor(diffHours)
          });
        }
      }
    }

    // Status counts
    statusCounts[rawStatus] = (statusCounts[rawStatus] || 0) + 1;

    // Novedad reasons
    if (novedad) {
      const key = novedad.substring(0, 50);
      novedadTypes[key] = (novedadTypes[key] || 0) + 1;
    }

    // Por fecha
    if (!salesByDate[date]) {
      salesByDate[date] = { 
        date, weekKey, orders: 0, confirmed: 0, cancelled: 0, delivered: 0, returned: 0, novedad: 0, 
        revenue: 0, grossRevenue: 0, ganancia: 0, cogs: 0, shipping: 0, commissions: 0,
        grossCogs: 0, grossShipping: 0, grossCommissions: 0, shippingReturns: 0
      };
    }
    salesByDate[date].orders++;
    if (!st.isCancelled) {
      salesByDate[date].confirmed++;
      salesByDate[date].grossRevenue += total;
      salesByDate[date].grossCogs += costoTotal;
      salesByDate[date].grossShipping += flete;
      salesByDate[date].grossCommissions += comision;
    }
    if (st.isCancelled)  salesByDate[date].cancelled++;
    if (st.isDelivered)  { 
      salesByDate[date].delivered++; 
      salesByDate[date].revenue += total; 
      salesByDate[date].ganancia += ganancia; 
      salesByDate[date].cogs += costoTotal; 
      salesByDate[date].shipping += flete; 
      salesByDate[date].commissions += comision;
    }
    if (st.isReturned) {
      salesByDate[date].returned++;
      salesByDate[date].shippingReturns += devFlete > 0 ? devFlete : flete;
    }
    if (st.isNovedad)    salesByDate[date].novedad++;

    // Por ciudad
    if (!citiesData[city]) citiesData[city] = { city, orders: 0, confirmed: 0, delivered: 0, returned: 0, novedad: 0 };
    citiesData[city].orders++;
    if (!st.isCancelled) citiesData[city].confirmed++;
    if (st.isDelivered)  citiesData[city].delivered++;
    if (st.isReturned)   citiesData[city].returned++;
    if (st.isNovedad)    citiesData[city].novedad++;

    // Por departamento
    if (!deptData[dept]) deptData[dept] = { dept, orders: 0, delivered: 0, returned: 0 };
    deptData[dept].orders++;
    if (st.isDelivered) deptData[dept].delivered++;
    if (st.isReturned)  deptData[dept].returned++;

    // Por transportadora
    if (!transportData[courier]) {
      transportData[courier] = { courier, orders: 0, delivered: 0, returned: 0, novedad: 0 };
    }
    transportData[courier].orders++;
    if (st.isDelivered) transportData[courier].delivered++;
    if (st.isReturned)  transportData[courier].returned++;
    if (st.isNovedad)   transportData[courier].novedad++;

    // Por producto
    const pKey = product.substring(0, 45);
    if (!productData[pKey]) productData[pKey] = { product: pKey, sku, orders: 0, delivered: 0, returned: 0, revenue: 0, cogs: 0 };
    productData[pKey].orders++;
    if (st.isDelivered) { productData[pKey].delivered++; productData[pKey].revenue += total; productData[pKey].cogs += costoTotal; }
    if (st.isReturned)  productData[pKey].returned++;

    // Por vendedor
    if (!vendedorData[seller]) vendedorData[seller] = { seller, orders: 0, confirmed: 0, delivered: 0, returned: 0 };
    vendedorData[seller].orders++;
    if (!st.isCancelled) vendedorData[seller].confirmed++;
    if (st.isDelivered)  vendedorData[seller].delivered++;
    if (st.isReturned)   vendedorData[seller].returned++;

    // Por hora
    if (!isNaN(hourNum)) {
      const hk = `${String(hourNum).padStart(2,'0')}:00`;
      if (!hourlyData[hk]) hourlyData[hk] = { hour: hk, orders: 0, delivered: 0 };
      hourlyData[hk].orders++;
      if (st.isDelivered) hourlyData[hk].delivered++;
    }
  });

  // Sort delayed orders from highest to lowest hours (descending)
  if (stats.delayedOrders) {
    stats.delayedOrders.sort((a, b) => b.horas - a.horas);
  }

  // === TASAS ===
  stats.confRate     = stats.totalOrders > 0 ? (stats.confirmed  / stats.totalOrders) * 100 : 0;
  stats.dispatchRate = stats.confirmed   > 0 ? (stats.dispatched / stats.confirmed)   * 100 : 0;
  stats.deliveryRate = stats.confirmed   > 0 ? (stats.delivered  / stats.confirmed)   * 100 : 0;
  stats.returnRate   = stats.confirmed   > 0 ? (stats.returned   / stats.confirmed)   * 100 : 0;
  stats.novedadRate  = stats.dispatched  > 0 ? (stats.novedad    / stats.dispatched)  * 100 : 0;
  stats.confirmationRate = stats.totalOrders > 0 ? (stats.confirmed / stats.totalOrders) * 100 : 0;

  // === INTELIGENCIA FINANCIERA CFO ===
  stats.netMargin = stats.revenue > 0 ? (stats.netProfit / stats.revenue) * 100 : 0;

  // Score de Escalabilidad (Score CEO)
  if (stats.delivered === 0) {
    stats.scalaScore = 'B';
  } else if (stats.deliveryRate > 80 && stats.netMargin > 15) {
    stats.scalaScore = 'A';
  } else if (stats.deliveryRate < 65 || stats.netMargin < 8) {
    stats.scalaScore = 'C';
  } else {
    stats.scalaScore = 'B';
  }

  // ROAS Break-Even Dinámico
  if (stats.revenue === 0) {
    const grossMarginForRoas = stats.grossRevenue - stats.grossCogs - stats.grossShipping - stats.grossCommissions;
    stats.roasBreakEven = grossMarginForRoas > 0 ? (stats.grossRevenue / grossMarginForRoas) : 0;
  } else {
    const marginForRoas = stats.revenue - stats.cogs - stats.shipping - stats.commissions;
    stats.roasBreakEven = marginForRoas > 0 ? (stats.revenue / marginForRoas) : 0;
  }

  // Tasa de Absorción de Devoluciones (Hemorragia de fletes)
  stats.returnAbsorptionRate = stats.revenue > 0 ? (stats.lossByReturns / stats.revenue) * 100 : 0;

  // Costo total devoluciones = fletes de retorno
  stats.lossByReturns = stats.shippingReturns;

  // === ARRAYS PARA GRÁFICAS ===
  const chartSalesByDate = Object.values(salesByDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  const chartCities = Object.values(citiesData)
    .filter(c => c.orders >= 2)
    .map(c => ({
      ...c,
      confRate: c.orders > 0 ? (c.confirmed / c.orders) * 100 : 0,
      retRate:  c.orders > 0 ? (c.returned  / c.orders) * 100 : 0,
      delRate:  c.orders > 0 ? (c.delivered / c.orders) * 100 : 0,
    }))
    .sort((a, b) => b.retRate - a.retRate)
    .slice(0, 12);

  const chartCitiesByConf = [...chartCities].sort((a, b) => b.confRate - a.confRate).slice(0, 12);

  const chartDepts = Object.values(deptData)
    .filter(d => d.orders >= 2)
    .map(d => ({
      ...d,
      retRate: d.orders > 0 ? (d.returned / d.orders) * 100 : 0,
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 10);

  const chartCouriers = Object.values(transportData)
    .filter(c => c.orders >= 1)
    .map(c => {
      const tot = c.delivered + c.returned;
      return {
        ...c,
        delRate: tot > 0 ? (c.delivered / tot) * 100 : 0,
        retRate: tot > 0 ? (c.returned  / tot) * 100 : 0,
        novRate: c.orders > 0 ? (c.novedad / c.orders) * 100 : 0,
      };
    })
    .sort((a, b) => b.orders - a.orders);

  const chartProducts = Object.values(productData)
    .filter(p => p.orders >= 1)
    .map(p => ({
      ...p,
      retRate:    p.orders > 0 ? (p.returned  / p.orders) * 100 : 0,
      delRate:    p.orders > 0 ? (p.delivered / p.orders) * 100 : 0,
      margin:     p.delivered > 0 ? ((p.revenue - p.cogs) / p.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 15);

  const chartVendedores = Object.values(vendedorData)
    .map(v => ({
      ...v,
      confRate: v.orders > 0 ? (v.confirmed / v.orders) * 100 : 0,
      delRate:  v.orders > 0 ? (v.delivered / v.orders) * 100 : 0,
      retRate:  v.orders > 0 ? (v.returned  / v.orders) * 100 : 0,
    }))
    .sort((a, b) => b.orders - a.orders);

  const chartHourly = Object.values(hourlyData)
    .sort((a, b) => a.hour.localeCompare(b.hour));

  const topNovedades = Object.entries(novedadTypes)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const chartStatuses = Object.entries(statusCounts)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // === ALERTAS IA ===
  const fmt = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
  const alerts = [];

  if (stats.returnRate > 10)
    alerts.push({ type: 'danger',  text: `Devolución en ${stats.returnRate.toFixed(1)}% — umbral crítico superado (meta < 10%).` });
  if (stats.confRate < 80)
    alerts.push({ type: 'danger',  text: `Confirmación en ${stats.confRate.toFixed(1)}% — fuga de leads en el embudo inicial (meta > 82%).` });
  if (stats.novedadRate > 8)
    alerts.push({ type: 'warning', text: `Novedades en ${stats.novedadRate.toFixed(1)}% del total despachado — revisar transportadoras.` });
  if (stats.pending > 200)
    alerts.push({ type: 'warning', text: `${stats.pending} pedidos pendientes sin gestionar — riesgo de cancelación masiva.` });
  if (stats.lossByReturns > 0)
    alerts.push({ type: 'warning', text: `Pérdida por fletes de devolución: ${fmt(stats.lossByReturns)} — optimizar logística inversa.` });

  const worstCity = chartCities[0];
  if (worstCity && worstCity.retRate > 15)
    alerts.push({ type: 'danger',  text: `${worstCity.city} con ${worstCity.retRate.toFixed(1)}% devoluciones — pausar pauta o ajustar filtros de calificación.` });

  const worstCourier = [...chartCouriers].sort((a,b) => b.retRate - a.retRate)[0];
  if (worstCourier && worstCourier.retRate > 15)
    alerts.push({ type: 'warning', text: `${worstCourier.courier} con ${worstCourier.retRate.toFixed(1)}% devoluciones — evaluar cambio de operador.` });

  if (stats.netProfit > 0)
    alerts.push({ type: 'success', text: `Ganancia neta estimada: ${fmt(stats.netProfit)} sobre ${stats.delivered} entregas efectivas.` });

  if (alerts.length === 0)
    alerts.push({ type: 'success', text: 'Operación dentro de parámetros normales. Sin alertas críticas activas.' });

  return {
    stats,
    chartSalesByDate,
    chartCities,
    chartCitiesByConf,
    chartDepts,
    chartCouriers,
    chartProducts,
    chartVendedores,
    chartHourly,
    topNovedades,
    chartStatuses,
    alerts,
    colMap: col,  // para debug
  };
}
