"use client";
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { analyzeData } from '@/lib/analyzeData';

const DataContext = createContext(null);

// Mapeo inverso: Supabase DB -> Excel Columns (lo que espera analyzeData)
function mapDBToExcel(dbRow) {
  return {
    'id': dbRow.id,
    'fecha de reporte': dbRow.fecha_reporte,
    'hora': dbRow.hora,
    'fecha': dbRow.fecha,
    'nombre cliente': dbRow.nombre_cliente,
    'telefono': dbRow.telefono,
    'número guia': dbRow.numero_guia,
    'estatus': dbRow.estatus,
    'tipo de envio': dbRow.tipo_envio,
    'departamento destino': dbRow.departamento_destino,
    'ciudad destino': dbRow.ciudad_destino,
    'direccion': dbRow.direccion,
    'transportadora': dbRow.transportadora,
    'total de la orden': dbRow.total_orden,
    'ganancia': dbRow.ganancia,
    'precio flete': dbRow.precio_flete,
    'costo devolucion flete': dbRow.costo_devolucion_flete,
    'comision': dbRow.comision,
    '% comision de la plataformma': dbRow.pct_comision,
    'precio proveedor': dbRow.precio_proveedor,
    'precio proveedor x cantidad': dbRow.precio_proveedor_x_cantidad,
    'producto id': dbRow.producto_id,
    'sku': dbRow.sku,
    'variacion id': dbRow.variacion_id,
    'producto': dbRow.producto,
    'variacion': dbRow.variacion,
    'cantidad': dbRow.cantidad,
    'novedad': dbRow.novedad,
    'fue solucionada la novedad': dbRow.fue_solucionada_novedad,
    'hora de novedad': dbRow.hora_novedad,
    'fecha de novedad': dbRow.fecha_novedad,
    'solución': dbRow.solucion,
    'hora de solucion': dbRow.hora_solucion,
    'fecha de solucion': dbRow.fecha_solucion,
    'observación': dbRow.observacion,
    'hora de ultimo movimiento': dbRow.hora_ultimo_movimiento,
    'fecha de ultimo movimiento': dbRow.fecha_ultimo_movimiento,
    'último movimiento': dbRow.ultimo_movimiento,
    'concepto último movimiento': dbRow.concepto_ultimo_movimiento,
    'ubicacion de ultimo movimiento': dbRow.ubicacion_ultimo_movimiento,
    'vendedor': dbRow.vendedor,
    'tipo de tienda': dbRow.tipo_tienda,
    'tienda': dbRow.tienda,
    'id de orden de tienda': dbRow.id_orden_tienda,
    'numero de pedido de tienda': dbRow.numero_pedido_tienda,
    'tags': dbRow.tags,
    'fecha guia generada': dbRow.fecha_guia_generada,
    'contador de indemnizaciones': dbRow.contador_indemnizaciones,
    'concepto ultima indenmnizacion': dbRow.concepto_ultima_indemnizacion,
    'historial_gestion': dbRow.historial_gestion,
    'estado_gestion': dbRow.estado_gestion,
  };
}

export function DataProvider({ children }) {
  const [state, setState] = useState({
    role:         null, // null = No logueado, 'CEO' o 'VENDEDORA'
    loaded:       false,
    loading:      true,
    uploading:    false,
    uploadResult: null,
    fileName:     '',
    lastUpload:   null,
    data:         null,
    rawRows:      null,
    metaData:     null,
    error:        null,
    dateFilter:   'all', // 'today', 'yesterday', 'this_week', 'this_month', 'all', 'custom'
    customDateStart: '',
    customDateEnd: '',
    minDataDate: '',
    maxDataDate: '',
    commentsMap:  {}, // Almacena comentarios indexados por ID de orden
  });

  const toggleRole = useCallback(() => {
    setState(s => ({ ...s, role: s.role === 'CEO' ? 'VENDEDORA' : 'CEO' }));
  }, []);

  const setRole = useCallback((newRole) => {
    setState(s => ({ ...s, role: newRole }));
  }, []);

  const setDateFilter = useCallback((filter, start = '', end = '') => {
    setState(s => {
      if (s.dateFilter === filter && s.customDateStart === start && s.customDateEnd === end) return s;
      return { ...s, dateFilter: filter, customDateStart: start, customDateEnd: end };
    });
  }, []);

  // Recalcular data si rawRows o dateFilter cambian
  useEffect(() => {
    if (state.rawRows) {
      // Find min/max dates from rawRows
      let minDate = null;
      let maxDate = null;
      
      state.rawRows.forEach(row => {
        const rawDate = String(row['fecha'] || row['fecha de reporte'] || '');
        const cleanDate = rawDate.split(' ')[0].split('T')[0] || '';
        let d = null;
        if (cleanDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
          const [day, month, year] = cleanDate.split('-');
          d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else if (cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = cleanDate.split('-');
          d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        if (d && !isNaN(d.getTime())) {
          if (!minDate || d < minDate) minDate = d;
          if (!maxDate || d > maxDate) maxDate = d;
        }
      });

      const minDateStr = minDate ? minDate.toISOString().split('T')[0] : '';
      const maxDateStr = maxDate ? maxDate.toISOString().split('T')[0] : '';

      const analyzed = analyzeData(state.rawRows, state.dateFilter, state.customDateStart, state.customDateEnd);
      setState(s => ({ ...s, data: analyzed, minDataDate: minDateStr, maxDataDate: maxDateStr }));
    }
  }, [state.rawRows, state.dateFilter, state.customDateStart, state.customDateEnd]);

  // Carga desde Supabase y Meta
  const loadFromDB = useCallback(async () => {
    try {
      setState(s => ({ ...s, loading: true, error: null }));
      const [resDb, resMeta] = await Promise.all([
        fetch('/api/fetch', { cache: 'no-store' }),
        fetch('/api/meta', { cache: 'no-store' })
      ]);
      
      const resultDb = await resDb.json();
      const resultMeta = await resMeta.json();
      
      if (!resDb.ok) throw new Error(resultDb.error || 'Error al conectar con la base de datos');
      
      const metaData = resultMeta.configured ? resultMeta.data : null;

      if (resultDb.records && resultDb.records.length > 0) {
        console.log(`[NODIA OPS] Cargados ${resultDb.records.length} registros desde Supabase`);
        
        // Crear mapa de comentarios y estados de gestión de Supabase
        const commentsMap = {};
        resultDb.records.forEach(r => {
          if (r.historial_gestion || r.estado_gestion) {
            commentsMap[r.id] = {
              historial_gestion: r.historial_gestion || '',
              estado_gestion: r.estado_gestion || 'Pendiente'
            };
          }
        });

        // Mapear de vuelta al formato Excel que espera analyzeData
        const excelRows = resultDb.records.map(mapDBToExcel);
        const analyzed = analyzeData(excelRows);
        
        setState(s => ({
          ...s,
          loaded:      true,
          loading:     false,
          fileName:    `Base de Datos (${resultDb.records.length} registros)`,
          lastUpload:  resultDb.lastUpload,
          data:        analyzed,
          rawRows:     excelRows,
          metaData:    metaData,
          commentsMap: commentsMap,
          error:       null,
        }));
      } else {
        // BD vacía
        setState(s => ({
          ...s,
          loaded:      true,
          loading:     false,
          fileName:    '',
          metaData:    metaData,
          commentsMap: {},
          error:       null
        }));
      }
    } catch (err) {
      console.error('[NODIA OPS] Error loading from DB:', err);
      setState(s => ({
        ...s,
        loaded:  true,
        loading: false,
        error:   err.message || 'Error al cargar de Supabase. Sube el Excel manualmente.',
      }));
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    loadFromDB();
  }, [loadFromDB]);

  const loadFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('Sube un archivo Excel (.xlsx o .xls) válido de Dropi.');
      return;
    }

    setState(s => ({ ...s, loading: true, uploading: true, error: null, fileName: 'Procesando...', uploadResult: null }));

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const wb   = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

        if (!rows.length) {
          setState(s => ({ ...s, loading: false, uploading: false, error: 'El archivo está vacío.' }));
          return;
        }

        // Obtener commentsMap actual de manera segura
        let currentCommentsMap = {};
        setState(s => {
          currentCommentsMap = s.commentsMap;
          return s;
        });

        // Fusionar comentarios existentes desde Supabase en las filas del Excel recién cargado
        const mergedRows = rows.map(row => {
          const idKey = Object.keys(row).find(k => k.toLowerCase().trim() === 'id');
          const id = idKey ? String(row[idKey] || '').trim() : '';
          const comment = currentCommentsMap[id];
          if (comment) {
            return {
              ...row,
              'historial_gestion': comment.historial_gestion,
              'estado_gestion': comment.estado_gestion
            };
          }
          return row;
        });

        // Transformar y subir a Supabase automáticamente
        const { transformRows } = await import('@/lib/uploadToSupabase');
        const records = transformRows(mergedRows, file.name);

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records, fileName: file.name }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Error al subir los datos a Supabase');

        // Recargar desde Supabase para asegurar sincronía
        await loadFromDB();

        setState(s => ({
          ...s,
          uploading: false,
          uploadResult: result,
          error: null
        }));

      } catch (err) {
        console.error('[NODIA OPS] Error al procesar y subir Excel:', err);
        setState(s => ({ ...s, loading: false, uploading: false, error: err.message || 'Error al procesar el archivo.' }));
        alert('ERROR AL SUBIR A SUPABASE: ' + (err.message || 'Error desconocido'));
      }
    };
    reader.readAsArrayBuffer(file);
  }, [loadFromDB]);

  // Subir datos a Supabase via API Route del servidor
  const pushToSupabase = useCallback(async () => {
    if (!state.rawRows?.length) {
      alert('No hay datos cargados para subir.');
      return;
    }
    setState(s => ({ ...s, uploading: true, uploadResult: null }));
    try {
      // Transformar filas al formato Supabase antes de enviar
      const { transformRows } = await import('@/lib/uploadToSupabase');
      const records = transformRows(state.rawRows, state.fileName);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, fileName: state.fileName }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error en el servidor');
      
      // Recargar desde la base de datos para recuperar y mantener sincronizados los comentarios/estados
      await loadFromDB();
      
      setState(s => ({ ...s, uploading: false, uploadResult: result }));
    } catch (err) {
      console.error('[NODIA OPS] Error upload:', err);
      setState(s => ({ ...s, uploading: false, uploadResult: { error: err.message } }));
    }
  }, [state.rawRows, state.fileName, loadFromDB]);

  // Actualizar un comentario modificado en tiempo real en el estado global
  const updateComment = useCallback((id, historial, estado) => {
    setState(s => {
      const newCommentsMap = { ...s.commentsMap };
      newCommentsMap[id] = { historial_gestion: historial, estado_gestion: estado };
      
      const newRawRows = s.rawRows ? s.rawRows.map(row => {
        const idKey = Object.keys(row).find(k => k.toLowerCase().trim() === 'id');
        const rowId = idKey ? String(row[idKey] || '').trim() : '';
        if (rowId === String(id)) {
          return {
            ...row,
            'historial_gestion': historial,
            'estado_gestion': estado
          };
        }
        return row;
      }) : null;
      
      return {
        ...s,
        commentsMap: newCommentsMap,
        rawRows: newRawRows
      };
    });
  }, []);

  const deleteOrder = useCallback((id) => {
    setState(s => {
      const newRawRows = s.rawRows ? s.rawRows.filter(row => {
        const idKey = Object.keys(row).find(k => k.toLowerCase().trim() === 'id');
        const rowId = idKey ? String(row[idKey] || '').trim() : '';
        return rowId !== String(id);
      }) : null;
      
      const newCommentsMap = { ...s.commentsMap };
      delete newCommentsMap[id];

      return {
        ...s,
        rawRows: newRawRows,
        commentsMap: newCommentsMap
      };
    });
  }, []);

  const reset = useCallback(() => {
    setState({ loaded: false, loading: false, uploading: false, uploadResult: null, fileName: '', data: null, rawRows: null, error: null, dateFilter: 'all', commentsMap: {} });
  }, []);

  return (
    <DataContext.Provider value={{ ...state, loadFile, pushToSupabase, reset, toggleRole, setRole, setDateFilter, updateComment, deleteOrder }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
