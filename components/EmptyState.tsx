"use client";

import { BarChart3 } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export default function EmptyState({
  title = "No data available",
  message = "Try adjusting your filters or sync data from Guesty",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 bg-slate-100 rounded-full mb-4">
        <BarChart3 className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-700">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">{message}</p>
    </div>
  );
}
