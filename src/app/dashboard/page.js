"use client";
import { useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import * as XLSX from 'xlsx';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { es } from 'date-fns/locale/es';

registerLocale('es', es);

const fmt = v => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
const pct = (a, b) => b > 0 ? ((a / b) * 100).toFixed(0) + '%' : '0%';

const getPlaybookRecommendation = (estatus, novedad) => {
  const est = (estatus || '').toUpperCase();
  const nov = (novedad || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (est.includes('REENVIO') || est.includes('REENVÍO')) {
    return "Reintento de entrega programado. Confirmar disponibilidad del cliente hoy y que tenga el dinero listo.";
  }
  if (est.includes('RECLAME') || est.includes('OFICINA')) {
    return "Paquete listo en oficina. Enviar dirección de la oficina y número de guía al cliente para que lo retire.";
  }
  if (est === 'PENDIENTE') {
    return "Pedido sin despachar. Verificar stock, confirmar dirección o agilizar empaque.";
  }

  if (nov.includes('DIRECCION') || nov.includes('NOMENCLATURA') || nov.includes('UBICAC') || nov.includes('BARRIO') || nov.includes('NOMINACION')) {
    return "Dirección errónea. Pedir ubicación por WhatsApp, confirmar barrio, casa o indicaciones detalladas.";
  }
  if (nov.includes('TELEFONO') || nov.includes('CONTACT') || nov.includes('LLAM') || nov.includes('CELULAR')) {
    return "Teléfono erróneo o no responde. Solicitar número de respaldo o confirmar horario ideal de llamada.";
  }
  if (nov.includes('NO ESTABA') || nov.includes('CERRADO') || nov.includes('AUSENTE') || nov.includes('ENCONTRABA') || nov.includes('VISITA')) {
    return "Cliente ausente. Acordar por WhatsApp un día de entrega o si un tercero (portería/vecino) puede recibirlo.";
  }
  if (nov.includes('DINERO') || nov.includes('PAGO') || nov.includes('EFECTIVO') || nov.includes('FONDOS') || nov.includes('RECAUDO')) {
    return "Falta de efectivo. Reprogramar la entrega para el día de pago del cliente.";
  }
  if (nov.includes('REHUSADO') || nov.includes('RECHAZ') || nov.includes('NO SOLICITO') || nov.includes('NO RECONOCE')) {
    return "Rechazado. Indagar motivo: ¿arrepentimiento o demora? Intentar salvar la venta ofreciendo solución.";
  }
  if (nov.includes('ZONA') || nov.includes('PELIGROSA') || nov.includes('DIFICIL ACCESO') || nov.includes('COBERTURA')) {
    return "Zona de difícil acceso. Ofrecer entrega en oficina principal de la transportadora (Reclame en Oficina).";
  }

  return "Contactar al cliente por WhatsApp para aclarar el problema e insistir en la entrega.";
};

const getBodegaRecommendation = (estatus) => {
  const est = (estatus || '').toUpperCase();
  if (est.includes('CONFIRMADO')) {
    return "Pedido confirmado. Generar guía y empacar el producto para despacho hoy.";
  }
  if (est.includes('PREPARADO')) {
    return "Empacado. Esperando recolección. Si lleva >24h, solicitar recolección urgente.";
  }
  if (est.includes('GUIA GENERADA') || est.includes('GUIA_GENERADA')) {
    return "Guía impresa. Validar con el mensajero si ya recogió el paquete.";
  }
  return "Validar el estado de empaque y coordinar recolección urgente.";
};

function NovedadRow({ order, i }) {
  const [historial, setHistorial] = useState(order['historial_gestion'] || '');
  const [estado, setEstado] = useState(order['estado_gestion'] || 'Pendiente');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const estatus = order['estatus'] || 'N/A';
  const isError = estatus.toUpperCase().includes('NOVEDAD');
  const clienteNombre = order['nombre cliente'] || 'Desconocido';
  const clienteTelefono = order['teléfono'] || order['telefono'] || '';
  const rawTel = String(clienteTelefono).replace(/[^0-9]/g, '');
  const cleanTel = rawTel ? (rawTel.startsWith('57') ? rawTel : `57${rawTel}`) : '';
  const waUrl = rawTel ? `https://api.whatsapp.com/send?phone=${cleanTel}&text=${encodeURIComponent(
    `Hola ${clienteNombre}, te escribimos de Tienda RDA. Vemos que tu pedido con guía #${order['número guia'] || order['id'] || 'N/A'} presenta la novedad: "${order['novedad'] || estatus}". ¿Nos confirmas tus datos para ayudarte a solucionarlo y reprogramar la entrega?`
  )}` : null;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/update-novedad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order['id'],
          historial_gestion: historial,
          estado_gestion: estado
        })
      });
      if (res.ok) {
        setSaved(true);
        order['historial_gestion'] = historial;
        order['estado_gestion'] = estado;
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('Error al guardar');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
    setSaving(false);
  };

  return (
    <tr className="hover:bg-surface-container-high transition-colors group">
      <td className="p-4 text-sm font-bold text-secondary font-mono">
        {order['número guia'] || order['id'] || `ORD-${i}`}
      </td>
      <td className="p-4 text-xs font-mono text-outline">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
          {order['fecha'] || order['fecha de reporte'] || 'Sin fecha'}
        </div>
      </td>
      <td className="p-4 text-sm font-medium">
        <div className="text-on-surface truncate max-w-[150px]" title={clienteNombre}>{clienteNombre}</div>
        <div className="text-[10px] text-outline font-mono mt-0.5">{clienteTelefono || 'Sin teléfono'}</div>
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-500 hover:text-emerald-400 text-[10px] font-bold mt-1 transition-colors">
            <span className="material-symbols-outlined text-[12px]">chat</span> WhatsApp
          </a>
        )}
      </td>
      <td className="p-4 text-sm text-on-surface-variant">
        {order['ciudad destino'] || 'Sin ciudad'}
        <div className="text-[10px] text-outline">{order['departamento destino'] || ''}</div>
      </td>
      <td className="p-4 min-w-[220px]">
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${isError ? 'bg-tertiary/20 text-tertiary border border-tertiary/30' : 'bg-surface-container-high text-outline'}`}>
          {estatus}
        </span>
        <div className="text-xs text-error font-medium max-w-[200px] whitespace-normal mt-1" title={order['novedad']}>
          {order['novedad'] || 'Requiere revisión manual'}
        </div>
        <div className="mt-2 text-[11px] bg-sky-100 border border-sky-200 text-sky-950 rounded-lg p-2.5 flex items-start gap-1.5 max-w-[240px] leading-relaxed whitespace-normal shadow-md font-medium">
          <span className="material-symbols-outlined text-[15px] mt-0.5 flex-shrink-0 text-sky-600">tips_and_updates</span>
          <span>{getPlaybookRecommendation(estatus, order['novedad'])}</span>
        </div>
      </td>
      <td className="p-4 min-w-[200px]">
        <textarea 
          className="w-full bg-surface-container border border-outline-variant rounded p-2 text-xs font-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          rows={2}
          placeholder="Añadir notas de gestión..."
          value={historial}
          onChange={(e) => setHistorial(e.target.value)}
        />
      </td>
      <td className="p-4 text-center space-y-2">
        <select 
          className={`w-full text-xs font-bold rounded px-2 py-1.5 border outline-none cursor-pointer transition-colors ${
            estado === 'Pendiente' ? 'bg-orange-500/10 text-orange-600 border-orange-500/30' :
            estado === 'En Gestión' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
            estado === 'Solucionado' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
            'bg-red-500/10 text-red-600 border-red-500/30'
          }`}
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
        >
          <option className="bg-surface text-on-surface" value="Pendiente">PENDIENTE</option>
          <option className="bg-surface text-on-surface" value="ADMITIDA">ADMITIDA</option>
          <option className="bg-surface text-on-surface" value="EN BODEGA TRANSPORTADORA">EN BODEGA TRANSPORTADORA</option>
          <option className="bg-surface text-on-surface" value="EN REPARTO">EN REPARTO</option>
          <option className="bg-surface text-on-surface" value="ENTREGADO">ENTREGADO</option>
          <option className="bg-surface text-on-surface" value="RECLAME EN OFICINA">RECLAME EN OFICINA</option>
          <option className="bg-surface text-on-surface" value="REENVÍO">REENVÍO</option>
          <option className="bg-surface text-on-surface" value="DEVOLUCION">DEVOLUCION</option>
          <option className="bg-surface text-on-surface" value="CANCELADO">CANCELADO</option>
        </select>
        <button 
          onClick={handleSave}
          disabled={saving}
          className={`w-full px-2 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition-all ${
            saved ? 'bg-emerald-500 text-white' : 
            saving ? 'bg-surface-container-high text-outline' :
            'bg-primary hover:bg-primary/90 text-on-primary shadow'
          }`}
        >
          {saved ? <><span className="material-symbols-outlined text-[14px]">check</span> Ok</> : 
           saving ? 'Guardando...' : 'Guardar'}
        </button>
      </td>
    </tr>
  );
}

export function DelayedRow({ order, i }) {
  const [historial, setHistorial] = useState(order['historial_gestion'] || '');
  const [estado, setEstado] = useState(order['estado_gestion'] || 'Pendiente');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const clienteNombre = order['nombre cliente'] || 'Desconocido';
  const clienteTelefono = order['teléfono'] || order['telefono'] || '';
  const rawTel = String(clienteTelefono).replace(/[^0-9]/g, '');
  const cleanTel = rawTel ? (rawTel.startsWith('57') ? rawTel : `57${rawTel}`) : '';
  const waUrl = rawTel ? `https://api.whatsapp.com/send?phone=${cleanTel}&text=${encodeURIComponent(
    `Hola ${clienteNombre}, somos Tienda RDA. Vemos que tu pedido con guía #${order['número guia'] || order['id'] || 'N/A'} lleva varios días en la transportadora. Queríamos confirmarte que estamos gestionando para agilizar la entrega.`
  )}` : null;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/update-novedad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order['id'],
          historial_gestion: historial,
          estado_gestion: estado
        })
      });
      if (res.ok) {
        setSaved(true);
        order['historial_gestion'] = historial;
        order['estado_gestion'] = estado;
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('Error al guardar');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
    setSaving(false);
  };

  return (
    <tr className="hover:bg-error/5 transition-colors group">
      <td className="p-4 text-sm font-bold text-on-surface font-mono">
        {order['número guia'] || order['id'] || `ORD-${i}`}
      </td>
      <td className="p-4 text-xs font-mono text-outline">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
          {order['fecha'] || order['fecha de reporte'] || 'Sin fecha'}
        </div>
      </td>
      <td className="p-4 text-sm font-medium">
        <div className="text-on-surface truncate max-w-[150px]" title={clienteNombre}>{clienteNombre}</div>
        <div className="text-[10px] text-outline font-mono mt-0.5">{clienteTelefono || 'Sin teléfono'}</div>
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-500 hover:text-emerald-400 text-[10px] font-bold mt-1 transition-colors">
            <span className="material-symbols-outlined text-[12px]">chat</span> WhatsApp
          </a>
        )}
      </td>
      <td className="p-4 text-sm text-on-surface-variant truncate max-w-[200px]" title={order['producto']}>{order['producto'] || 'Desconocido'}</td>
      <td className="p-4 text-right">
        <span className={`px-2 py-0.5 text-[11px] font-bold rounded uppercase ${order.horas > 48 ? 'bg-error text-on-error' : 'bg-orange-500/20 text-orange-400'}`}>
          {order.horas} horas
        </span>
      </td>
      <td className="p-4">
        <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-surface-container-high text-outline border border-outline-variant/30">
          {order['estatus'] || 'CONFIRMADO'}
        </span>
        <div className="mt-2 text-[11px] bg-sky-100 border border-sky-200 text-sky-950 rounded-lg p-2.5 flex items-start gap-1.5 max-w-[240px] leading-relaxed whitespace-normal shadow-md font-medium">
          <span className="material-symbols-outlined text-[15px] mt-0.5 flex-shrink-0 text-sky-600">tips_and_updates</span>
          <span>{getBodegaRecommendation(order['estatus'])}</span>
        </div>
      </td>
      <td className="p-4 min-w-[200px]">
        <textarea 
          className="w-full bg-surface-container border border-outline-variant rounded p-2 text-xs font-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          rows={2}
          placeholder="Añadir notas..."
          value={historial}
          onChange={(e) => setHistorial(e.target.value)}
        />
      </td>
      <td className="p-4 text-center space-y-2">
        <select 
          className={`w-full text-xs font-bold rounded px-2 py-1.5 border outline-none cursor-pointer transition-colors ${
            estado === 'Pendiente' ? 'bg-orange-500/10 text-orange-600 border-orange-500/30' :
            estado === 'ENTREGADO' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' :
            estado === 'DEVOLUCION' || estado === 'CANCELADO' ? 'bg-red-500/10 text-red-600 border-red-500/30' :
            'bg-blue-500/10 text-blue-600 border-blue-500/30'
          }`}
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
        >
          <option className="bg-surface text-on-surface" value="Pendiente">PENDIENTE</option>
          <option className="bg-surface text-on-surface" value="ADMITIDA">ADMITIDA</option>
          <option className="bg-surface text-on-surface" value="EN BODEGA TRANSPORTADORA">EN BODEGA TRANSPORTADORA</option>
          <option className="bg-surface text-on-surface" value="EN REPARTO">EN REPARTO</option>
          <option className="bg-surface text-on-surface" value="ENTREGADO">ENTREGADO</option>
          <option className="bg-surface text-on-surface" value="RECLAME EN OFICINA">RECLAME EN OFICINA</option>
          <option className="bg-surface text-on-surface" value="REENVÍO">REENVÍO</option>
          <option className="bg-surface text-on-surface" value="DEVOLUCION">DEVOLUCION</option>
          <option className="bg-surface text-on-surface" value="CANCELADO">CANCELADO</option>
        </select>
        <button 
          onClick={handleSave}
          disabled={saving}
          className={`w-full px-2 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition-all ${
            saved ? 'bg-emerald-500 text-white' : 
            saving ? 'bg-surface-container-high text-outline' :
            'bg-primary hover:bg-primary/90 text-on-primary shadow'
          }`}
        >
          {saved ? <><span className="material-symbols-outlined text-[14px]">check</span> Ok</> : 
           saving ? '...' : 'Guardar'}
        </button>
      </td>
    </tr>
  );
}

export default function DashboardPage() {
  const { loaded, data: gd, rawRows, lastUpload, dateFilter, setDateFilter, customDateStart, customDateEnd, minDataDate, maxDataDate, metaData } = useData();
  const [zoomMode, setZoomMode] = useState(false);

  const urgentOrders = useMemo(() => {
    if (!rawRows) return [];
    return rawRows.filter(order => {
      const estatus = (order['estatus'] || '').toUpperCase();
      const isSolved = (order['fue solucionada la novedad'] || '').toUpperCase() === 'SI' || estatus.includes('SOLUCIONADA');

      // Calcular horas transcurridas desde la creación del pedido
      const rawDate = order['fecha'] || order['fecha de reporte'] || '';
      const cleanDate = String(rawDate).split(' ')[0].split('T')[0] || '';
      let jsDate = null;
      if (cleanDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
        const [d, m, y] = cleanDate.split('-');
        jsDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      } else if (cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = cleanDate.split('-');
        jsDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      }
      
      const rawHora = order['hora'] || '';
      const hourNum = parseInt(String(rawHora).split(':')[0]);
      
      let diffHours = 0;
      if (jsDate) {
        const orderDate = new Date(jsDate);
        if (!isNaN(hourNum)) orderDate.setHours(hourNum);
        diffHours = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60);
      }

      // Si es PENDIENTE, solo califica como novedad si lleva más de 24 horas sin guía
      const isPending = estatus.includes('PENDIENTE');
      if (isPending) {
        return diffHours > 24;
      }

      const isNovedadState = estatus.includes('NOVEDAD') || estatus.includes('RECLAME') || estatus.includes('OFICINA') || estatus.includes('REENVIO') || estatus.includes('REENVÍO');
      return isNovedadState && !isSolved;
    });
  }, [rawRows]);

  const exportNovedades = () => {
    if (urgentOrders.length === 0) {
      alert("No hay novedades para exportar.");
      return;
    }

    const exportData = urgentOrders.map(o => ({
      "FECHA DE REPORTE": o['fecha de reporte'],
      "ID": o['id'],
      "HORA": o['hora'],
      "FECHA": o['fecha'],
      "NOMBRE CLIENTE": o['nombre cliente'],
      "TELÉFONO": o['teléfono'] || o['telefono'],
      "NÚMERO GUIA": o['número guia'],
      "ESTATUS": o['estatus'],
      "DEPARTAMENTO DESTINO": o['departamento destino'],
      "CIUDAD DESTINO": o['ciudad destino'],
      "DIRECCION": o['direccion'],
      "TRANSPORTADORA": o['transportadora'],
      "NOVEDAD": o['novedad'],
      "TOTAL DE LA ORDEN": o['total de la orden'],
      "HISTORIAL DE GESTIÓN (OPERADOR)": o['historial_gestion'] || '',
      "ESTADO DE GESTIÓN": o['estado_gestion'] || 'Pendiente'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Seguimiento Novedades");
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Seguimiento_Novedades_${today}.xlsx`);
  };

  if (!loaded || !gd) return (
    <div className="p-container-padding text-on-surface">
      <h2 className="font-display-lg text-4xl font-bold">Control Operacional</h2>
      <p className="mt-4 text-outline font-label-mono text-label-xs uppercase">Esperando Sincronización...</p>
    </div>
  );

  const { stats, alerts } = gd;

  // Filtrado de gasto publicitario de Meta Ads según fechas activas
  const filteredMetaSpend = useMemo(() => {
    if (!metaData?.daily) return 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay() + 1);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const start = customDateStart ? new Date(customDateStart + "T00:00:00") : null;
    const end = customDateEnd ? new Date(customDateEnd + "T23:59:59") : null;

    const filtered = metaData.daily.filter(day => {
      const rowDate = new Date(day.date + "T12:00:00");
      rowDate.setHours(0,0,0,0);

      if (dateFilter === 'all') return true;
      if (dateFilter === 'today') return rowDate.getTime() === today.getTime();
      if (dateFilter === 'yesterday') return rowDate.getTime() === yesterday.getTime();
      if (dateFilter === 'this_week') return rowDate >= firstDayOfWeek && rowDate <= today;
      if (dateFilter === 'this_month') return rowDate >= firstDayOfMonth && rowDate <= today;
      if (dateFilter === 'custom') {
        if (start && rowDate < start) return false;
        if (end && rowDate > end) return false;
        return true;
      }
      return true;
    });

    return filtered.reduce((sum, d) => sum + (d.spend || 0), 0);
  }, [metaData, dateFilter, customDateStart, customDateEnd]);

  const roasBase = stats.revenue > 0 ? stats.revenue : stats.grossRevenue;
  const realRoas = filteredMetaSpend > 0 ? roasBase / filteredMetaSpend : 0;

  const bucketLeads = stats.totalOrders || 0;
  const bucketPending = stats.exPending || 0;
  const bucketCancelled = stats.exCancelado || 0;
  const bucketBodega = stats.exBodega || 0;
  const bucketTransito = (stats.exTransito || 0) + (stats.exNovedad || 0);
  const bucketReturned = stats.exDevuelto || 0;
  const bucketDelivered = stats.exEntregado || 0;

  const FilterButton = ({ filterKey, label }) => {
    const active = dateFilter === filterKey;
    return (
      <button 
        onClick={() => setDateFilter(filterKey, customDateStart, customDateEnd)}
        className={`px-3 py-1.5 text-xs font-bold rounded-md shadow-sm transition-colors ${
          active ? 'bg-primary text-on-primary' : 'bg-surface-container text-outline hover:text-on-surface hover:bg-surface-container-high'
        }`}
      >
        {label}
      </button>
    );
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    const startStr = start ? start.toISOString().split('T')[0] : '';
    const endStr = end ? end.toISOString().split('T')[0] : '';
    setDateFilter('custom', startStr, endStr);
  };

  const startDate = customDateStart ? new Date(customDateStart + "T12:00:00") : null;
  const endDate = customDateEnd ? new Date(customDateEnd + "T12:00:00") : null;
  const minDate = minDataDate ? new Date(minDataDate + "T12:00:00") : null;
  const maxDate = maxDataDate ? new Date(maxDataDate + "T12:00:00") : null;

  return (
    <>
      {/* Header Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-outline-variant pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-secondary/20 text-secondary font-label-mono text-[10px] rounded uppercase">Sistema en Vivo</span>
            {(() => {
              const score = stats.scalaScore || 'B';
              if (score === 'A') {
                return (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-label-mono text-[10px] rounded uppercase font-bold animate-pulse flex items-center gap-1">
                    🟢 ESCALAR PAUTA (Score A)
                  </span>
                );
              }
              if (score === 'C') {
                return (
                  <span className="px-2 py-0.5 bg-error/10 text-error border border-error/20 font-label-mono text-[10px] rounded uppercase font-bold animate-pulse flex items-center gap-1">
                    🔴 PAUSAR PAUTA (Score C)
                  </span>
                );
              }
              return (
                <span className="px-2 py-0.5 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 font-label-mono text-[10px] rounded uppercase font-bold flex items-center gap-1">
                  🟡 MANTENER / OPTIMIZAR (Score B)
                </span>
              );
            })()}
            <span className="text-outline text-xs">
              Sincronizado {lastUpload ? (() => {
                const diff = (Date.now() - new Date(lastUpload)) / 1000;
                if (diff < 60) return `hace ${Math.floor(diff)}s`;
                if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
                if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
                return `hace ${Math.floor(diff / 86400)}d`;
              })() : 'reciente'}
            </span>
          </div>
          <div className="flex flex-col xl:flex-row xl:items-center gap-4">
            <h2 className="font-display-lg text-4xl font-bold">Control Operacional</h2>
            
            {/* Global Date Filter */}
            <div className="hidden md:flex flex-wrap items-center bg-surface-container-low p-1 rounded-lg xl:ml-6 gap-1 relative z-50">
              <FilterButton filterKey="all" label="Histórico" />
              <FilterButton filterKey="today" label="Hoy" />
              <FilterButton filterKey="yesterday" label="Ayer" />
              <FilterButton filterKey="this_week" label="Semana" />
              <FilterButton filterKey="this_month" label="Mes" />
              <FilterButton filterKey="custom" label="Rango" />
              
              {dateFilter === 'custom' && (
                <div className="ml-2 pl-2 border-l border-outline-variant/30 flex items-center">
                  <span className="material-symbols-outlined text-outline text-[18px] mr-1">calendar_month</span>
                  <DatePicker
                    selected={startDate}
                    onChange={handleDateChange}
                    startDate={startDate}
                    endDate={endDate}
                    minDate={minDate}
                    maxDate={maxDate}
                    selectsRange
                    locale="es"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Seleccionar rango"
                    className="bg-surface text-on-surface font-bold text-xs rounded border border-outline-variant px-2 py-1.5 outline-none focus:border-primary w-[160px]"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-10">
          <div className="text-right">
            <p className="text-outline font-label-mono text-[10px] uppercase">Ticket Promedio</p>
            <p className="text-on-surface font-bold text-lg">{fmt(stats.confirmed > 0 ? stats.grossRevenue / stats.confirmed : 0)}</p>
          </div>
          <div className="text-right">
            <p className="text-outline font-label-mono text-[10px] uppercase">Fletes Asumidos</p>
            <p className="text-orange-400 font-bold text-lg">{fmt((stats.shipping || 0) + (stats.shippingReturns || 0))}</p>
          </div>
        </div>
      </div>

      {/* Mobile Date Filter (visible only on small screens) */}
      <div className="md:hidden mt-4 flex flex-col gap-2 bg-surface-container-low p-2 rounded-lg">
        <div className="flex overflow-x-auto gap-1">
          <FilterButton filterKey="all" label="Histórico" />
          <FilterButton filterKey="today" label="Hoy" />
          <FilterButton filterKey="yesterday" label="Ayer" />
          <FilterButton filterKey="this_week" label="Semana" />
          <FilterButton filterKey="this_month" label="Mes" />
          <FilterButton filterKey="custom" label="Rango" />
        </div>
        
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/30 relative z-50">
            <span className="material-symbols-outlined text-outline text-[18px]">calendar_month</span>
            <DatePicker
              selected={startDate}
              onChange={handleDateChange}
              startDate={startDate}
              endDate={endDate}
              minDate={minDate}
              maxDate={maxDate}
              selectsRange
              locale="es"
              dateFormat="dd/MM/yyyy"
              placeholderText="Seleccionar rango"
              className="w-full bg-surface text-on-surface font-bold text-xs rounded border border-outline-variant px-2 py-1.5 outline-none focus:border-primary"
            />
          </div>
        )}
      </div>

      {/* KPI Layer with Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
        {/* Gross Margin */}
        <div className="glass-card p-5 rounded-premium flex flex-col justify-between group hover:border-primary/40 transition-all cursor-default">
          <div>
            <p className="text-on-surface-variant font-label-mono text-[10px] uppercase">Leads Generados</p>
            <h3 className="text-2xl font-bold mt-1 text-on-surface">{stats.totalOrders}</h3>
            <p className="text-emerald-600 text-xs font-bold mt-1">+12.4% <span className="text-on-surface-variant font-normal">vs Año Pasado</span></p>
          </div>
          <div className="h-10 mt-4 overflow-hidden relative">
            <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
              <path className="sparkline-path" d="M0,35 L10,32 L20,38 L30,25 L40,30 L50,15 L60,20 L70,10 L80,18 L90,5 L100,8" fill="none" stroke="#14B8A6" strokeWidth="3"></path>
            </svg>
          </div>
        </div>

        {/* Adjusted Metrics */}
        <div className="glass-card p-5 rounded-premium flex flex-col justify-between group hover:border-primary/40 transition-all cursor-default">
          <div>
            <p className="text-on-surface-variant font-label-mono text-[10px] uppercase">Total Vendido</p>
            <h3 className="text-2xl font-bold mt-1 text-on-surface">{fmt(stats.grossRevenue)}</h3>
            <p className="text-red-600 text-[10px] font-bold mt-1">Fuga: {fmt(stats.cancelledRevenue)} (Cancelado)</p>
          </div>
          <div className="h-10 mt-4 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
              <path className="sparkline-path" d="M0,20 L20,25 L40,15 L60,30 L80,10 L100,5" fill="none" stroke="#3B82F6" strokeWidth="3"></path>
            </svg>
          </div>
        </div>

        <div className="glass-card p-5 rounded-premium flex flex-col justify-between group hover:border-primary/40 transition-all cursor-default">
          <div>
            <p className="text-on-surface-variant font-label-mono text-[10px] uppercase">Fletes</p>
            <h3 className="text-2xl font-bold mt-1 text-on-surface">{fmt(stats.shipping)}</h3>
            <p className="text-red-600 text-[10px] font-bold mt-1">+ {fmt(stats.shippingReturns)} en devoluciones</p>
            <p className={`text-[10px] font-bold mt-0.5 ${(stats.returnAbsorptionRate || 0) > 5 ? 'text-red-600 animate-pulse' : 'text-emerald-600'}`}>
              Absorción Dev: {(stats.returnAbsorptionRate || 0).toFixed(1)}% {(stats.returnAbsorptionRate || 0) > 5 ? '⚠️' : '✅'}
            </p>
          </div>
          <div className="h-10 mt-4 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
              <path className="sparkline-path" d="M0,30 L20,35 L40,15 L60,10 L80,25 L100,20" fill="none" stroke="#F59E0B" strokeWidth="3"></path>
            </svg>
          </div>
        </div>

        <div className="glass-card p-5 rounded-premium flex flex-col justify-between group hover:border-primary/40 transition-all cursor-default">
          <div>
            <p className="text-on-surface-variant font-label-mono text-[10px] uppercase">Costo Producto</p>
            <h3 className="text-2xl font-bold mt-1 text-on-surface">{fmt(stats.cogs)}</h3>
            <p className="text-emerald-600 text-[10px] font-bold mt-1">Margen: {stats.revenue ? ((stats.revenue - stats.cogs) / stats.revenue * 100).toFixed(1) : 0}%</p>
          </div>
          <div className="h-10 mt-4 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
              <path className="sparkline-path" d="M0,10 L20,15 L40,5 L60,25 L80,15 L100,5" fill="none" stroke="#EF4444" strokeWidth="3"></path>
            </svg>
          </div>
        </div>
        
        {/* Real Utility (Dropi specific calculation) */}
        <div className="glass-card p-5 rounded-premium flex flex-col justify-between bg-gradient-to-br from-[#14B8A6]/5 to-[#14B8A6]/10 border border-[#14B8A6]/20 group hover:border-[#14B8A6]/40 transition-all cursor-default shadow-md">
          <div>
            <div className="flex justify-between items-start">
              <p className="text-primary font-label-mono text-[10px] uppercase">Total Utilidad</p>
              <span className="material-symbols-outlined text-primary/50 text-sm">account_balance</span>
            </div>
            <h3 className="text-3xl font-bold mt-1 text-primary">{fmt(stats.ganancia > 0 ? stats.ganancia : stats.netProfit)}</h3>
            <p className="text-on-surface-variant text-[9px] mt-1">(Entregados ya pagados)</p>
            {filteredMetaSpend > 0 && (
              <div className="mt-2 pt-2 border-t border-[#14B8A6]/10 flex justify-between text-[10px] font-label-mono">
                <span className="text-on-surface-variant">ROAS Real: <span className={realRoas < (stats.roasBreakEven || 0) ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>{realRoas.toFixed(2)}x</span></span>
                <span className="text-on-surface-variant">Target BE: <span className="text-on-surface font-bold">{(stats.roasBreakEven || 0).toFixed(2)}x</span></span>
              </div>
            )}
          </div>
          <div className="h-10 mt-4 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
              <path className="sparkline-path" d="M0,38 L20,30 L40,25 L60,15 L80,10 L100,2" fill="none" stroke="#14B8A6" strokeLinecap="round" strokeWidth="3"></path>
            </svg>
          </div>
        </div>
      </div>

      {/* Enhanced Funnel Section */}
      <div className="grid grid-cols-12 gap-6 mt-6">
        <div className="col-span-12 lg:col-span-8 glass-card rounded-premium p-8 relative overflow-hidden group">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h4 className="text-xl font-bold flex items-center gap-2 text-on-surface">
                <span className="material-symbols-outlined text-primary">filter_alt</span>
                Rendimiento Operativo
              </h4>
              <p className="text-on-surface-variant text-sm">Métricas del embudo de conversión en tiempo real</p>
            </div>
            <div className="hidden">
              <button className="px-4 py-1.5 text-xs font-bold bg-primary text-on-primary rounded-md shadow-lg">En vivo</button>
              <button className="px-4 py-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">Histórico</button>
            </div>
          </div>
          {/* Visual Funnel - 7 Exclusive Buckets */}
          <div className="relative flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 mt-8 min-h-[120px]">
            {/* 1. LEADS */}
            <div className="flex flex-col items-center group/stage">
              <div className="relative w-16 h-16 rounded-full border-[4px] border-primary/20 flex flex-col items-center justify-center transition-all bg-surface hover:border-primary hover:scale-105 z-10 shadow-md">
                <span className="text-lg font-black text-on-surface">{bucketLeads}</span>
                <span className="text-[8px] font-label-mono text-on-surface-variant uppercase tracking-wider text-center">Leads</span>
              </div>
            </div>
            
            {/* Connection 1 */}
            <div className="hidden lg:block flex-1 h-0.5 bg-outline-variant/30 relative">
              <div className="absolute inset-y-0 left-0 bg-yellow-500/30" style={{width: '100%'}}></div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-amber-600 font-label-mono text-[9px] font-bold bg-surface px-1">{pct(stats.exPending, stats.totalOrders)}</div>
            </div>
 
            {/* 2. PENDIENTES */}
            <div className="flex flex-col items-center group/stage opacity-85 hover:opacity-100 transition-opacity">
              <div className="relative w-24 h-14 rounded-lg border border-amber-500/20 flex flex-col items-center justify-center transition-all bg-amber-500/5 hover:border-amber-500 hover:bg-amber-500/10 z-10">
                <span className="text-base font-bold text-amber-600">{bucketPending}</span>
                <span className="text-[8px] font-label-mono text-amber-600/70 uppercase tracking-wider text-center">Pendientes</span>
              </div>
            </div>
 
            {/* Connection 2 */}
            <div className="hidden lg:block flex-1 h-0.5 bg-outline-variant/30 relative">
              <div className="absolute inset-y-0 left-0 bg-orange-500/30" style={{width: '100%'}}></div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-orange-600 font-label-mono text-[9px] font-bold bg-surface px-1">{pct(stats.exCancelado, stats.totalOrders)}</div>
              {(() => {
                const lowConf = (stats.confirmationRate || 0) < 80;
                return (
                  <div className={`absolute -bottom-5 left-1/2 -translate-x-1/2 font-label-mono text-[8px] font-bold bg-surface px-1 whitespace-nowrap rounded border transition-colors ${
                    lowConf 
                      ? 'text-red-600 bg-red-500/10 border-red-500/20 animate-pulse' 
                      : 'text-primary bg-primary/10 border-[#14B8A6]/20'
                  }`}>
                    {lowConf ? '⚠️ ' : ''}{(stats.confirmationRate || 0).toFixed(0)}% Conf.
                  </div>
                );
              })()}
            </div>
 
            {/* 3. CANCELADOS */}
            <div className="flex flex-col items-center group/stage opacity-80 hover:opacity-100 transition-opacity">
              <div className="relative w-24 h-14 rounded-lg border border-orange-500/20 flex flex-col items-center justify-center transition-all bg-orange-500/5 hover:border-orange-500 hover:bg-orange-500/10 z-10">
                <span className="text-base font-bold text-orange-600">{bucketCancelled}</span>
                <span className="text-[8px] font-label-mono text-orange-600/70 uppercase tracking-wider text-center">Cancelados</span>
              </div>
            </div>
 
            {/* Connection 3 */}
            <div className="hidden lg:block flex-1 h-0.5 bg-outline-variant/30 relative">
              <div className="absolute inset-y-0 left-0 bg-primary/30" style={{width: '100%'}}></div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-primary font-label-mono text-[9px] font-bold bg-surface px-1">{pct(stats.exBodega, stats.totalOrders)}</div>
            </div>
 
            {/* 4. EN BODEGA */}
            <div className="flex flex-col items-center group/stage">
              <div className="relative w-28 h-16 rounded-xl border border-primary/30 flex flex-col items-center justify-center transition-all bg-primary/10 hover:border-primary hover:bg-primary/20 z-10 shadow-sm">
                <span className="text-xl font-black text-primary">{bucketBodega}</span>
                <span className="text-[9px] font-label-mono text-primary/80 uppercase tracking-wider text-center">En Bodega</span>
                {stats.bodegaSLA > 0 && (
                  <div className="absolute -top-2.5 -right-2.5 bg-error text-on-error text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-lg animate-pulse border border-error/50 whitespace-nowrap z-50">
                    ⚠️ {stats.bodegaSLA} &gt;24h
                  </div>
                )}
              </div>
            </div>
 
            {/* Connection 4 */}
            <div className="hidden lg:block flex-1 h-0.5 bg-outline-variant/30 relative">
              <div className="absolute inset-y-0 left-0 bg-secondary/30" style={{width: '100%'}}></div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-emerald-600 font-label-mono text-[9px] font-bold bg-surface px-1">{pct(stats.exTransito + stats.exNovedad, stats.totalOrders)}</div>
            </div>
 
            {/* 5. EN TRÁNSITO */}
            <div className="flex flex-col items-center group/stage">
              <div className="relative w-24 h-14 rounded-lg border border-secondary/20 flex flex-col items-center justify-center transition-all bg-secondary/5 hover:border-secondary hover:bg-secondary/10 z-10">
                <span className="text-base font-bold text-emerald-600">{bucketTransito}</span>
                <span className="text-[8px] font-label-mono text-emerald-600/70 uppercase tracking-wider text-center">En Tránsito</span>
              </div>
            </div>
 
            {/* Connection 5 */}
            <div className="hidden lg:block flex-1 h-0.5 bg-outline-variant/30 relative">
              <div className="absolute inset-y-0 left-0 bg-error/30" style={{width: '100%'}}></div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-red-600 font-label-mono text-[9px] font-bold bg-surface px-1">{pct(stats.exDevuelto, stats.totalOrders)}</div>
            </div>
 
            {/* 6. DEVUELTOS */}
            <div className="flex flex-col items-center group/stage opacity-80 hover:opacity-100 transition-opacity">
              <div className="relative w-24 h-14 rounded-lg border border-error/20 flex flex-col items-center justify-center transition-all bg-error/5 hover:border-error hover:bg-error/10 z-10">
                <span className="text-base font-bold text-red-600">{bucketReturned}</span>
                <span className="text-[8px] font-label-mono text-red-600/70 uppercase tracking-wider text-center">Devueltos</span>
              </div>
            </div>
 
            {/* Connection 6 */}
            <div className="hidden lg:block flex-1 h-0.5 bg-outline-variant/30 relative">
              <div className="absolute inset-y-0 left-0 bg-tertiary/30" style={{width: '100%'}}></div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-amber-600 font-label-mono text-[9px] font-bold bg-surface px-1">{pct(stats.exEntregado, stats.totalOrders)}</div>
            </div>
 
            {/* 7. ENTREGADO */}
            <div className="flex flex-col items-center group/stage">
              <div className="relative w-16 h-16 rounded-full border-[4px] border-tertiary/20 flex flex-col items-center justify-center transition-all bg-surface hover:border-tertiary hover:scale-105 z-10 shadow-md">
                <span className="text-lg font-black text-amber-600">{bucketDelivered}</span>
                <span className="text-[8px] font-label-mono text-amber-600/70 uppercase tracking-wider text-center">Entregado</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Operations Map */}
        <div className="col-span-12 lg:col-span-4 glass-card rounded-premium p-6 overflow-hidden flex flex-col">
          <h4 className="font-bold mb-4 flex items-center justify-between text-on-surface">
            Salud Regional
            <span className="text-[10px] font-label-mono text-outline uppercase">Foco Colombia</span>
          </h4>
          <div className="flex-1 bg-surface-container-low rounded-xl relative overflow-hidden border border-outline-variant flex items-center justify-center min-h-[200px]">
            <div className="absolute inset-0 opacity-40 mix-blend-overlay">
              <img className="w-full h-full object-cover grayscale brightness-50" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgoDzxHZcH6DoV7laUU2jx6icbL4POT-lQlOcGa2NCPWslN8HDhmSguUA4lR4es1C3jUtpgZfQW0idg3mUNhoSi9RKqlO6b8wyxa_IfToTjGo5XmGyRnt52fPpwKo8xAh4TDlbTeJRDUka5gQ18Ey2BZRti8S9bDHrAE9JCQIMMDanXoBqR2hLP0OEf3tlsHp6TtMI1zrPKNFDzY7H1mt5FGpi_em1V4sDPk52nGKcOHCoHkedwxswsTJpsmswauLPZIRU_J6n0pjg" />
            </div>
            <div className="relative z-10 w-full p-4 space-y-3">
              {gd.chartCities && gd.chartCities.slice(0, 3).map((city, i) => {
                const isError = city.retRate > 15;
                const isWarn = city.retRate > 10;
                return (
                  <div key={i} className="flex items-center justify-between bg-surface/80 backdrop-blur p-2 rounded-lg border border-outline-variant/30">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isError ? 'bg-error animate-pulse' : isWarn ? 'bg-tertiary' : 'bg-secondary'}`}></span>
                      <span className="text-xs font-bold">{city.city}</span>
                    </div>
                    <span className={`text-[10px] font-label-mono ${isError ? 'text-error' : isWarn ? 'text-tertiary' : 'text-secondary'}`}>
                      {isError ? `CRÍTICO (${(city.retRate || 0).toFixed(1)}% dev)` : isWarn ? `ALERTA (${(city.retRate || 0).toFixed(1)}% dev)` : `ESTABLE (${(city.retRate || 0).toFixed(1)}% dev)`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Actionable AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {alerts.slice(0, 3).map((al, i) => {
          const isError = al.type === 'danger';
          const isWarn = al.type === 'warning';
          const cBorder = isError ? 'border-error' : isWarn ? 'border-tertiary' : 'border-secondary';
          const cBgIcon = isError ? 'bg-error/10' : isWarn ? 'bg-tertiary/10' : 'bg-secondary/10';
          const cText = isError ? 'text-error' : isWarn ? 'text-tertiary' : 'text-secondary';
          const cBtnBg = isError ? 'bg-error' : isWarn ? 'bg-tertiary' : 'bg-secondary';
          const cBtnText = isError ? 'text-on-error' : isWarn ? 'text-on-tertiary' : 'text-on-secondary';
          const cShadow = isError ? 'hover:shadow-[0_0_15px_rgba(255,180,171,0.3)]' : '';
          
          const icon = isError ? 'trending_down' : isWarn ? 'local_shipping' : 'auto_awesome';
          const title = isError ? 'Alerta Crítica' : isWarn ? 'Precaución' : 'Optimización';

          return (
            <div key={i} className={`glass-card p-6 rounded-premium border-l-4 ${cBorder} relative group overflow-hidden`}>
              <div className="absolute top-0 right-0 p-2 opacity-5">
                <span className="material-symbols-outlined text-6xl">warning</span>
              </div>
              <div className="flex items-start gap-4">
                <div className={`p-3 ${cBgIcon} rounded-xl`}>
                  <span className={`material-symbols-outlined ${cText}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h5 className="font-bold text-on-surface">{title}</h5>
                  </div>
                  <p className="text-on-surface-variant text-sm mt-2 leading-relaxed">
                    {al.text}
                  </p>
                  <div className="mt-4 flex gap-3">
                    <button className={`px-4 py-1.5 ${cBtnBg} ${cBtnText} rounded-lg text-xs font-bold transition-all ${cShadow}`}>Aplicar</button>
                    <button className="px-4 py-1.5 border border-outline-variant rounded-lg text-xs font-bold hover:bg-surface-container-high transition-all">Detalles</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {stats.delayedOrders && stats.delayedOrders.length > 0 && (
        <div className="glass-card rounded-premium overflow-hidden border border-error/20 mt-6">
          <div className="p-6 border-b border-error/15 flex justify-between items-center bg-error/5">
            <div>
              <h4 className="text-xl font-bold flex items-center gap-2 text-error">
                <span className="material-symbols-outlined text-error">hourglass_empty</span>
                Alerta Crítica: Estancados en Bodega
              </h4>
              <p className="text-on-surface-variant text-xs mt-1">Pedidos confirmados que llevan más de 24h sin ser despachados (Alto riesgo de cancelación)</p>
            </div>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-[10px] font-label-mono text-error uppercase bg-error/10 px-3 py-1 rounded-full border border-error/20 font-bold">
                <span className="w-1.5 h-1.5 bg-error rounded-full animate-pulse"></span> SLA Incumplido ({stats.delayedOrders.length})
              </span>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-10 bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="p-4 font-label-mono text-[10px] text-on-surface-variant uppercase">Guía / ID</th>
                  <th className="p-4 font-label-mono text-[10px] text-on-surface-variant uppercase">Fecha Orden</th>
                  <th className="p-4 font-label-mono text-[10px] text-on-surface-variant uppercase">Cliente</th>
                  <th className="p-4 font-label-mono text-[10px] text-on-surface-variant uppercase">Producto</th>
                  <th className="p-4 font-label-mono text-[10px] text-on-surface-variant uppercase text-right">Horas sin guía</th>
                  <th className="p-4 font-label-mono text-[10px] text-on-surface-variant uppercase">Estado Dropi</th>
                  <th className="p-4 font-label-mono text-[10px] text-on-surface-variant uppercase">Historial de Gestión</th>
                  <th className="p-4 font-label-mono text-[10px] text-on-surface-variant uppercase text-center w-[120px]">Estado Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {stats.delayedOrders.map((order, i) => (
                  <DelayedRow key={order.id || i} order={order} i={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Structured Live Orders Table (Actionable) */}
      <div className="glass-card rounded-premium overflow-hidden border border-outline-variant/30 mt-6">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/40">
          <div>
            <h4 className="text-xl font-bold flex items-center gap-2 text-on-surface">
              <span className="material-symbols-outlined text-tertiary">emergency</span>
              Centro de Rescates: Novedades Activas ({urgentOrders.length})
            </h4>
            <p className="text-on-surface-variant text-xs">Pedidos que requieren gestión inmediata de la COO para evitar devoluciones</p>
          </div>
          <div className="flex gap-4 items-center">
            <button 
              onClick={() => setZoomMode(true)}
              className="bg-primary/10 border border-[#14B8A6]/20 text-primary hover:bg-primary/20 px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-[14px]">zoom_in</span>
              Modo Enfoque
            </button>
            <button 
              onClick={exportNovedades}
              className="bg-surface text-on-surface hover:bg-surface-container-high px-3 py-1.5 rounded border border-outline-variant text-[10px] font-bold uppercase transition-all flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              Exportar
            </button>
            <span className="flex items-center gap-1.5 text-[10px] font-label-mono text-tertiary uppercase bg-tertiary/10 px-3 py-1 rounded-full border border-tertiary/20 font-bold">
              <span className="w-1.5 h-1.5 bg-tertiary rounded-full animate-pulse"></span> Requiere Acción
            </span>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 z-10 bg-surface-container-low shadow-sm">
              <tr>
                <th className="p-4 font-label-mono text-[10px] text-on-surface-variant uppercase">ID / Guía</th>
                <th className="p-4 font-label-mono text-[10px] text-on-surface-variant uppercase">Fecha Orden</th>
                <th className="p-4 font-label-mono text-[10px] text-on-surface-variant uppercase">Cliente</th>
                <th className="p-4 font-label-mono text-[10px] text-on-surface-variant uppercase">Destino</th>
                <th className="p-4 font-label-mono text-[10px] text-on-surface-variant uppercase">Novedad Dropi</th>
                <th className="p-4 font-label-mono text-[10px] text-on-surface-variant uppercase">Historial de Gestión</th>
                <th className="p-4 font-label-mono text-[10px] text-on-surface-variant uppercase text-center w-[120px]">Estado Operador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {urgentOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-4xl mb-2 text-emerald-500/50">task_alt</span>
                      <p className="font-label-mono text-sm">Operación limpia.</p>
                      <p className="text-xs">No hay novedades ni rescates pendientes.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                urgentOrders.slice(0, 100).map((order, i) => (
                  <NovedadRow key={order.id || i} order={order} i={i} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Espejo Dropi: Resumen Exacto */}
      <div className="glass-card rounded-premium overflow-hidden border border-outline-variant/30 mt-6 mb-10">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low/40 flex justify-between items-center">
          <h4 className="font-bold flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-secondary">fact_check</span>
            Resumen del mes (Espejo Dropi)
          </h4>
          <span className="px-2 py-1 text-[10px] font-label-mono uppercase bg-secondary/10 text-secondary rounded border border-secondary/20">Modo Auditoría</span>
        </div>
        <div className="p-0">
          <table className="w-full text-sm text-left">
            <tbody className="divide-y divide-outline-variant/20">
              <tr className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total generado:</td>
                <td className="py-3 px-6 font-bold text-on-surface">{stats.totalOrders}</td>
              </tr>
              <tr className="bg-surface-container-low/30 hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total vendido:</td>
                <td className="py-3 px-6 font-bold text-on-surface">{fmt(stats.grossRevenue || 0)}</td>
              </tr>
              <tr className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total utilidad:</td>
                <td className="py-3 px-6 font-bold text-on-surface">{fmt(stats.ganancia || 0)}</td>
              </tr>
              <tr className="bg-surface-container-low/30 hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total utilidad estimada:</td>
                <td className="py-3 px-6 font-bold text-on-surface">{fmt((stats.grossRevenue || 0) - (stats.grossCogs || 0) - (stats.grossShipping || 0) - (stats.grossCommissions || 0))}</td>
              </tr>
              <tr className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total flete:</td>
                <td className="py-3 px-6 font-bold text-on-surface">{fmt((stats.shipping || 0) + (stats.shippingReturns || 0))}</td>
              </tr>
              <tr className="bg-surface-container-low/30 hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total con recaudo:</td>
                <td className="py-3 px-6 font-bold text-on-surface">{fmt(stats.grossRevenue || 0)}</td>
              </tr>
              <tr className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total sin recaudo:</td>
                <td className="py-3 px-6 font-bold text-on-surface">$0</td>
              </tr>
              <tr className="bg-surface-container-low/30 hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total recaudado:</td>
                <td className="py-3 px-6 font-bold text-on-surface">{fmt(stats.revenue || 0)}</td>
              </tr>
              <tr className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total por recaudar:</td>
                <td className="py-3 px-6 font-bold text-on-surface">{fmt(Math.max(0, (stats.grossRevenue || 0) - (stats.revenue || 0)))}</td>
              </tr>
              <tr className="bg-surface-container-low/30 hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total pedidos pendientes:</td>
                <td className="py-3 px-6 font-bold text-on-surface">{stats.pending || 0}</td>
              </tr>
              <tr className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total pedidos entregados:</td>
                <td className="py-3 px-6 font-bold text-on-surface">{stats.delivered || 0}</td>
              </tr>
              <tr className="bg-surface-container-low/30 hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total guias generadas:</td>
                <td className="py-3 px-6 font-bold text-on-surface">0</td>
              </tr>
              <tr className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total pedidos en procesamiento:</td>
                <td className="py-3 px-6 font-bold text-on-surface">0</td>
              </tr>
              <tr className="bg-surface-container-low/30 hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total pedidos rechazados:</td>
                <td className="py-3 px-6 font-bold text-on-surface">0</td>
              </tr>
              <tr className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total pedidos cancelados:</td>
                <td className="py-3 px-6 font-bold text-on-surface">{stats.cancelled || 0}</td>
              </tr>
              <tr className="bg-surface-container-low/30 hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total novedades:</td>
                <td className="py-3 px-6 font-bold text-on-surface">{stats.novedad || 0}</td>
              </tr>
              <tr className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total novedades resueltas:</td>
                <td className="py-3 px-6 font-bold text-on-surface">0</td>
              </tr>
              <tr className="bg-surface-container-low/30 hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total devoluciones:</td>
                <td className="py-3 px-6 font-bold text-on-surface">{stats.returned || 0}</td>
              </tr>
              <tr className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total ordenes por confirmar:</td>
                <td className="py-3 px-6 font-bold text-on-surface">0</td>
              </tr>
              <tr className="bg-surface-container-low/30 hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total ordenes sin movimiento:</td>
                <td className="py-3 px-6 font-bold text-on-surface">0</td>
              </tr>
              <tr className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-6 text-on-surface-variant">Total ordenes en otros statuses:</td>
                <td className="py-3 px-6 font-bold text-on-surface">
                  {Math.max(0, (stats.totalOrders || 0) - ((stats.delivered || 0) + (stats.pending || 0) + (stats.cancelled || 0) + (stats.novedad || 0) + (stats.returned || 0)))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Full-Screen Zoom/Focus Modal */}
      {zoomMode && (
        <div className="fixed inset-0 bg-background/98 z-50 p-8 flex flex-col backdrop-blur-md transition-all duration-300">
          {/* Modal Header */}
          <div className="flex justify-between items-center pb-6 border-b border-outline-variant mb-6">
            <div>
              <h3 className="font-display-lg text-2xl font-bold flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-primary text-2xl">zoom_in</span>
                Modo Enfoque: Novedades Activas ({urgentOrders.length})
              </h3>
              <p className="text-outline text-sm mt-1">Panel de alta concentración para la resolución rápida de incidentes.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={exportNovedades}
                className="bg-surface text-on-surface hover:bg-surface-container-highest px-4 py-2 rounded-lg border border-outline-variant text-xs font-bold uppercase transition-all flex items-center gap-1 shadow"
              >
                <span className="material-symbols-outlined text-sm">download</span> Exportar
              </button>
              <button 
                onClick={() => setZoomMode(false)}
                className="bg-error hover:bg-error/90 text-on-error px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1 shadow"
              >
                <span className="material-symbols-outlined text-sm">fullscreen_exit</span> Salir
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto rounded-xl border border-outline-variant/30 bg-surface-container-low/20 custom-scrollbar">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-10 bg-surface-container shadow-sm">
                <tr>
                  <th className="p-4 font-label-mono text-[10px] text-outline uppercase">ID / Guía</th>
                  <th className="p-4 font-label-mono text-[10px] text-outline uppercase">Fecha Orden</th>
                  <th className="p-4 font-label-mono text-[10px] text-outline uppercase">Cliente</th>
                  <th className="p-4 font-label-mono text-[10px] text-outline uppercase">Destino</th>
                  <th className="p-4 font-label-mono text-[10px] text-outline uppercase">Novedad Dropi</th>
                  <th className="p-4 font-label-mono text-[10px] text-outline uppercase">Historial de Gestión</th>
                  <th className="p-4 font-label-mono text-[10px] text-outline uppercase text-center w-[120px]">Estado Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 bg-surface">
                {urgentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-outline">
                      <div className="flex flex-col items-center justify-center">
                        <span className="material-symbols-outlined text-4xl mb-2 text-emerald-500/50">task_alt</span>
                        <p className="font-label-mono text-sm">Operación limpia.</p>
                        <p className="text-xs">No hay novedades ni rescates pendientes.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  urgentOrders.map((order, i) => (
                    <NovedadRow key={order.id || i} order={order} i={i} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
