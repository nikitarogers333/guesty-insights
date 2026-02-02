"use client";

import { clsx } from "clsx";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export default function ChartCard({ title, subtitle, children, className }: ChartCardProps) {
  return (
    <div className={clsx("bg-white rounded-xl shadow-sm p-6", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
