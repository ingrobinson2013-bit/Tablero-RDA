"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ComposedChart, Line, Area, Legend } from 'recharts';

const TIP_STYLE = { 
  backgroundColor: '#FFFFFF', 
  borderColor: '#E2E8F0', 
  borderRadius: '8px', 
  color: '#0F172A', 
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)'
};

function fmt(val) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
}

/* Ventas por día — barras con revenue en COP */
export function SalesByDayChart({ data }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="font-bold text-on-surface text-base mb-5">📦 Ventas & Entregas por Día</h3>
      <div style={{ height: 280, minHeight: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" stroke="#64748B" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke="#64748B" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v).replace('COP', '').trim()} />
            <Tooltip contentStyle={TIP_STYLE} formatter={(val, name) => name === 'Ingresos' ? fmt(val) : val} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Bar yAxisId="left" dataKey="orders"    name="Pedidos"   fill="#14B8A6" radius={[4,4,0,0]} barSize={14} />
            <Bar yAxisId="left" dataKey="delivered" name="Entregados" fill="#22C55E" radius={[4,4,0,0]} barSize={14} />
            <Bar yAxisId="left" dataKey="returned"  name="Devueltos"  fill="#EF4444" radius={[4,4,0,0]} barSize={14} />
            <Line yAxisId="right" type="monotone" dataKey="revenue" name="Ingresos" stroke="#F59E0B" strokeWidth={3} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* Tendencia confirmación vs devolución */
export function TrendChart({ data }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="font-bold text-on-surface text-base mb-5">📈 Tendencia Operativa (30 días)</h3>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="gConf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#14B8A6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#14B8A6" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748B" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Area  type="monotone" dataKey="orders"    name="Pedidos"    fill="url(#gConf)" stroke="#14B8A6" strokeWidth={3} />
            <Line  type="monotone" dataKey="delivered" name="Entregados"  stroke="#22C55E" strokeWidth={3} dot={false} />
            <Line  type="monotone" dataKey="returned"  name="Devueltos"   stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* Barras horizontales genéricas */
export function HBarChart({ data, dataKey, label, color = "#14B8A6", nameKey = "name", suffix = "" }) {
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
          <XAxis type="number" stroke="#64748B" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}${suffix}`} />
          <YAxis dataKey={nameKey} type="category" stroke="#64748B" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={100} />
          <Tooltip contentStyle={TIP_STYLE} formatter={v => [`${v.toFixed(1)}${suffix}`, label]} />
          <Bar dataKey={dataKey} name={label} fill={color} radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
