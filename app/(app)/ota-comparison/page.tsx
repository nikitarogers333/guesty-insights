"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { analyticsApi } from "@/lib/api/client";
import { useFilterStore } from "@/hooks/useFilters";
import ChartCard from "@/components/ChartCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import type { BySourceData } from "@/types/analytics";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value / 100);

export default function OTAComparison() {
  const { getQueryParams } = useFilterStore();
  const params = getQueryParams();

  const { data, isLoading, error } = useQuery<BySourceData>({
    queryKey: ["bySource", params],
    queryFn: () => analyticsApi.getBySource(params),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data?.sources || data.sources.length === 0) {
    return <EmptyState />;
  }

  const sources = data.sources.map((s) => ({
    ...s,
    source: s.source.toUpperCase(),
    adr: s.revenue / (s.bookings * s.avg_nights || 1) / 100,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">OTA Comparison</h2>
        <p className="text-slate-500">Compare performance across booking channels</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Bookings
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                ADR
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Avg Lead Time
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Avg Nights
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {sources.map((source, i) => (
              <tr key={source.source} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-medium text-slate-900">{source.source}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-slate-900">
                  {source.bookings.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-slate-900">
                  {formatCurrency(source.revenue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-slate-900">
                  ${source.adr.toFixed(0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-slate-900">
                  {source.avg_lead_time} days
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-slate-900">
                  {source.avg_nights.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue by OTA" subtitle="Total revenue per booking channel">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sources} layout="vertical">
              <XAxis type="number" tickFormatter={(v) => `$${(v / 100000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="source" width={80} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average Daily Rate (ADR)" subtitle="Revenue per night by channel">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sources} layout="vertical">
              <XAxis type="number" tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="source" width={80} />
              <Tooltip formatter={(value: number) => `$${value.toFixed(0)}`} />
              <Bar dataKey="adr" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Lead Time Comparison" subtitle="Days between booking and check-in">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sources} layout="vertical">
              <XAxis type="number" />
              <YAxis type="category" dataKey="source" width={80} />
              <Tooltip formatter={(value: number) => `${value} days`} />
              <Bar dataKey="avg_lead_time" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average Length of Stay" subtitle="Nights per booking by channel">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sources} layout="vertical">
              <XAxis type="number" />
              <YAxis type="category" dataKey="source" width={80} />
              <Tooltip formatter={(value: number) => `${value.toFixed(1)} nights`} />
              <Bar dataKey="avg_nights" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
