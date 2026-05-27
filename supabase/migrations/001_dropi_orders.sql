-- NODIA OPS - dropi_orders tabla principal
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS dropi_orders (
  id TEXT PRIMARY KEY,
  fecha_reporte DATE,
  hora TEXT,
  fecha DATE,
  week_key TEXT,
  nombre_cliente TEXT,
  telefono TEXT,
  email TEXT,
  tipo_identificacion TEXT,
  nro_identificacion TEXT,
  numero_guia TEXT,
  estatus TEXT,
  tipo_envio TEXT,
  departamento_destino TEXT,
  ciudad_destino TEXT,
  direccion TEXT,
  notas TEXT,
  transportadora TEXT,
  total_orden NUMERIC(12,2) DEFAULT 0,
  ganancia NUMERIC(12,2) DEFAULT 0,
  precio_flete NUMERIC(12,2) DEFAULT 0,
  costo_devolucion_flete NUMERIC(12,2) DEFAULT 0,
  comision NUMERIC(12,2) DEFAULT 0,
  pct_comision NUMERIC(6,4) DEFAULT 0,
  precio_proveedor NUMERIC(12,2) DEFAULT 0,
  precio_proveedor_x_cantidad NUMERIC(12,2) DEFAULT 0,
  producto_id TEXT,
  sku TEXT,
  variacion_id TEXT,
  producto TEXT,
  variacion TEXT,
  cantidad INTEGER DEFAULT 1,
  novedad TEXT,
  fue_solucionada_novedad TEXT,
  hora_novedad TEXT,
  fecha_novedad DATE,
  solucion TEXT,
  hora_solucion TEXT,
  fecha_solucion DATE,
  observacion TEXT,
  hora_ultimo_movimiento TEXT,
  fecha_ultimo_movimiento DATE,
  ultimo_movimiento TEXT,
  concepto_ultimo_movimiento TEXT,
  ubicacion_ultimo_movimiento TEXT,
  vendedor TEXT,
  tipo_tienda TEXT,
  tienda TEXT,
  id_orden_tienda TEXT,
  numero_pedido_tienda TEXT,
  tags TEXT,
  fecha_guia_generada DATE,
  contador_indemnizaciones INTEGER DEFAULT 0,
  concepto_ultima_indemnizacion TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  upload_batch TEXT
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_dropi_estatus ON dropi_orders (estatus);
CREATE INDEX IF NOT EXISTS idx_dropi_fecha ON dropi_orders (fecha);
CREATE INDEX IF NOT EXISTS idx_dropi_fecha_reporte ON dropi_orders (fecha_reporte);
CREATE INDEX IF NOT EXISTS idx_dropi_week_key ON dropi_orders (week_key);
CREATE INDEX IF NOT EXISTS idx_dropi_ciudad ON dropi_orders (ciudad_destino);
CREATE INDEX IF NOT EXISTS idx_dropi_transportadora ON dropi_orders (transportadora);
CREATE INDEX IF NOT EXISTS idx_dropi_vendedor ON dropi_orders (vendedor);
CREATE INDEX IF NOT EXISTS idx_dropi_producto ON dropi_orders (producto);
CREATE INDEX IF NOT EXISTS idx_dropi_sku ON dropi_orders (sku);

-- RLS
ALTER TABLE dropi_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acceso_autenticados" ON dropi_orders
  FOR ALL TO authenticated USING (true);

CREATE POLICY "acceso_anonimo" ON dropi_orders
  FOR ALL TO anon USING (true);

-- Vista KPIs por dia
CREATE OR REPLACE VIEW v_kpis_por_dia AS
SELECT
  fecha_reporte,
  week_key,
  COUNT(*) AS total_leads,
  COUNT(*) FILTER (WHERE estatus = 'CANCELADO') AS cancelados,
  COUNT(*) FILTER (WHERE estatus != 'CANCELADO') AS confirmados,
  COUNT(*) FILTER (WHERE estatus ILIKE '%ENTREGADO%') AS entregados,
  COUNT(*) FILTER (WHERE estatus ILIKE '%DEVOLUCION%' OR estatus ILIKE '%DEVUELTO%') AS devueltos,
  COUNT(*) FILTER (WHERE estatus ILIKE '%NOVEDAD%') AS novedades,
  SUM(total_orden) FILTER (WHERE estatus != 'CANCELADO') AS ventas_brutas,
  SUM(total_orden) FILTER (WHERE estatus ILIKE '%ENTREGADO%') AS ingresos_reales,
  SUM(ganancia) FILTER (WHERE estatus ILIKE '%ENTREGADO%') AS ganancia_total,
  SUM(precio_proveedor_x_cantidad) FILTER (WHERE estatus ILIKE '%ENTREGADO%') AS cogs,
  SUM(precio_flete) FILTER (WHERE estatus ILIKE '%ENTREGADO%') AS fletes_pagados,
  SUM(comision) FILTER (WHERE estatus ILIKE '%ENTREGADO%') AS comisiones
FROM dropi_orders
GROUP BY fecha_reporte, week_key
ORDER BY fecha_reporte DESC;

-- Vista KPIs por semana
CREATE OR REPLACE VIEW v_kpis_por_semana AS
SELECT
  week_key,
  COUNT(*) AS total_leads,
  COUNT(*) FILTER (WHERE estatus = 'CANCELADO') AS cancelados,
  COUNT(*) FILTER (WHERE estatus ILIKE '%ENTREGADO%') AS entregados,
  COUNT(*) FILTER (WHERE estatus ILIKE '%DEVOLUCION%' OR estatus ILIKE '%DEVUELTO%') AS devueltos,
  SUM(total_orden) FILTER (WHERE estatus != 'CANCELADO') AS ventas_brutas,
  SUM(ganancia) FILTER (WHERE estatus ILIKE '%ENTREGADO%') AS ganancia_total
FROM dropi_orders
GROUP BY week_key
ORDER BY week_key DESC;

-- Vista transportadoras
CREATE OR REPLACE VIEW v_transportadoras AS
SELECT
  transportadora,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE estatus ILIKE '%ENTREGADO%') AS entregados,
  COUNT(*) FILTER (WHERE estatus ILIKE '%DEVOLUCION%') AS devueltos,
  ROUND(COUNT(*) FILTER (WHERE estatus ILIKE '%ENTREGADO%') * 100.0 / NULLIF(COUNT(*),0), 1) AS pct_entrega,
  ROUND(COUNT(*) FILTER (WHERE estatus ILIKE '%DEVOLUCION%') * 100.0 / NULLIF(COUNT(*),0), 1) AS pct_devolucion
FROM dropi_orders
GROUP BY transportadora
ORDER BY total DESC;

-- Vista ciudades
CREATE OR REPLACE VIEW v_ciudades AS
SELECT
  ciudad_destino,
  departamento_destino,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE estatus ILIKE '%ENTREGADO%') AS entregados,
  COUNT(*) FILTER (WHERE estatus ILIKE '%DEVOLUCION%') AS devueltos,
  ROUND(COUNT(*) FILTER (WHERE estatus ILIKE '%DEVOLUCION%') * 100.0 / NULLIF(COUNT(*),0), 1) AS pct_devolucion
FROM dropi_orders
GROUP BY ciudad_destino, departamento_destino
ORDER BY total DESC;
