"use client";
import { Activity, CheckCircle, AlertTriangle, AlertCircle, Truck, DollarSign, Target } from 'lucide-react';

export default function KPICard({ title, value, meta, type, suffix = "" }) {
  let color = "text-on-surface";
  let badge = "bg-surface-container text-on-surface-variant";
  let Icon  = Activity;

  const v = parseFloat(value);

  if (type === 'confirmation') {
    if (v >= 85) { color = "text-emerald-600"; badge = "bg-emerald-500/10 text-emerald-600"; Icon = CheckCircle; }
    else if (v >= 80) { color = "text-amber-600"; badge = "bg-amber-500/10 text-amber-600"; Icon = AlertTriangle; }
    else { color = "text-red-600"; badge = "bg-red-500/10 text-red-600"; Icon = AlertCircle; }
  } else if (type === 'return') {
    if (v <= 8) { color = "text-emerald-600"; badge = "bg-emerald-500/10 text-emerald-600"; Icon = CheckCircle; }
    else if (v <= 12) { color = "text-amber-600"; badge = "bg-amber-500/10 text-amber-600"; Icon = AlertTriangle; }
    else { color = "text-red-600"; badge = "bg-red-500/10 text-red-600"; Icon = AlertCircle; }
  } else if (type === 'pending') {
    if (v <= 200) { color = "text-emerald-600"; badge = "bg-emerald-500/10 text-emerald-600"; Icon = CheckCircle; }
    else if (v <= 500) { color = "text-amber-600"; badge = "bg-amber-500/10 text-amber-600"; Icon = AlertTriangle; }
    else { color = "text-red-600"; badge = "bg-red-500/10 text-red-600"; Icon = AlertCircle; }
  } else if (type === 'dispatch') {
    if (v >= 90) { color = "text-emerald-600"; badge = "bg-emerald-500/10 text-emerald-600"; Icon = Truck; }
    else { color = "text-amber-600"; badge = "bg-amber-500/10 text-amber-600"; Icon = Truck; }
  } else if (type === 'profit') {
    color = "text-emerald-600"; badge = "bg-emerald-500/10 text-emerald-600"; Icon = DollarSign;
  } else {
    color = "text-[#14B8A6]"; badge = "bg-[#14B8A6]/10 text-[#14B8A6]"; Icon = Target;
  }

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col transition-all hover:border-primary/40 hover:shadow-xl hover:-translate-y-0.5">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-on-surface-variant font-bold text-sm tracking-wide">{title}</h3>
        <div className={`p-1.5 rounded-lg ${badge}`}><Icon size={16} /></div>
      </div>
      <span className={`text-3xl font-extrabold tracking-tight ${color}`}>{value}{suffix}</span>
      {meta && <div className="text-xs text-on-surface-variant mt-3">Meta: <span className="text-on-surface font-semibold">{meta}</span></div>}
    </div>
  );
}
