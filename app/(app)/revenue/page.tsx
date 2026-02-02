"use client";

import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { analyticsApi } from "@/lib/api/client";
import { useFilterStore } from "@/hooks/useFilters";
import KPICard from "@/components/KPICard";
import ChartCard from "@/components/ChartCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import type { SummaryData, BySourceData, TimeSeriesData } from "@/types/analytics";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value / 100);

export default function Revenue() {
  const { getQueryParams } = useFilterStore();
  const params = getQueryParams();

  const { data: summary, isLoading: summaryLoading } = useQuery<SummaryData>({
    queryKey: ["summary", params],
    queryFn: () => analyticsApi.getSummary(params),
  });

  const { data: bySource, isLoading: sourceLoading } = useQuery<BySourceData>({
    queryKey: ["bySource", params],
    queryFn: () => analyticsApi.getBySource(params),
  });

  const { data: timeSeries, isLoading: timeSeriesLoading } = useQuery<TimeSeriesData>({
    queryKey: ["timeSeries", params],
    queryFn: () => analyticsApi.getTimeSeries({ ...params, interval: "month" }),
  });

  const isLoading = summaryLoading || sourceLoading || timeSeriesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!summary || summary.total_revenue === 0) {
    return <EmptyState />;
  }

  const pieData =
    bySource?.sources.map((s) => ({
      name: s.source.toUpperCase(),
      value: s.revenue,
    })) || [];

  const avgBookingValue = summary.total_bookings > 0 ? summary.total_revenue / summary.total_bookings : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Revenue Analysis</h2>
        <p className="text-slate-500">Detailed breakdown of your revenue performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="Total Revenue" value={formatCurrency(summary.total_revenue)} icon={DollarSign} />
        <KPICard title="Avg Booking Value" value={formatCurrency(avgBookingValue)} icon={TrendingUp} />
        <KPICard title="Total Bookings" value={summary.total_bookings.toLocaleString()} icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue Over Time" subtitle="Monthly revenue trend" className="lg:col-span-2">
          {timeSeries?.data && timeSeries.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={timeSeries.data}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(v) => `$${(v / 100000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No trend data" />
          )}
        </ChartCard>

        <ChartCard title="Revenue by Source" subtitle="Distribution across channels">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No source data" />
          )}
        </ChartCard>

        <ChartCard title="Revenue Breakdown" subtitle="Detailed metrics by source">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm font-medium text-slate-500">Source</th>
                  <th className="text-right py-2 text-sm font-medium text-slate-500">Revenue</th>
                  <th className="text-right py-2 text-sm font-medium text-slate-500">Share</th>
                </tr>
              </thead>
              <tbody>
                {bySource?.sources.map((source, i) => (
                  <tr key={source.source} className="border-b last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm font-medium">{source.source.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 text-sm">{formatCurrency(source.revenue)}</td>
                    <td className="text-right py-3 text-sm text-slate-500">
                      {((source.revenue / summary.total_revenue) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
