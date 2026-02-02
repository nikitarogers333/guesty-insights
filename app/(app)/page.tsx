"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { DollarSign, Calendar, Clock, TrendingUp, Users, XCircle } from "lucide-react";
import { analyticsApi } from "@/lib/api/client";
import { useFilterStore } from "@/hooks/useFilters";
import KPICard from "@/components/KPICard";
import ChartCard from "@/components/ChartCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import type { SummaryData, BySourceData, TimeSeriesData } from "@/types/analytics";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value / 100);

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function Dashboard() {
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

  if (!summary || summary.total_bookings === 0) {
    return <EmptyState />;
  }

  const pieData =
    bySource?.sources.map((s) => ({
      name: s.source.toUpperCase(),
      value: s.revenue,
    })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard Overview</h2>
        <p className="text-slate-500">Key performance metrics for your vacation rentals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Total Revenue" value={formatCurrency(summary.total_revenue)} icon={DollarSign} />
        <KPICard title="Total Bookings" value={summary.total_bookings.toLocaleString()} icon={Calendar} />
        <KPICard title="Avg Lead Time" value={`${summary.avg_lead_time_days} days`} icon={Clock} />
        <KPICard title="Avg Stay Length" value={`${summary.avg_length_of_stay.toFixed(1)} nights`} icon={Users} />
        <KPICard title="Conversion Rate" value={formatPercent(summary.conversion_rate)} icon={TrendingUp} />
        <KPICard title="Cancellation Rate" value={formatPercent(summary.cancellation_rate)} icon={XCircle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue by Source" subtitle="Distribution across booking channels">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No source data" message="Sync data to see revenue breakdown" />
          )}
        </ChartCard>

        <ChartCard title="Bookings by Source" subtitle="Number of bookings per channel">
          {bySource?.sources && bySource.sources.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bySource.sources}>
                <XAxis dataKey="source" tickFormatter={(v) => v.toUpperCase()} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No booking data" message="Sync data to see bookings" />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Booking Trends" subtitle="Bookings and revenue over time">
        {timeSeries?.data && timeSeries.data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeries.data}>
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === "revenue" ? formatCurrency(value) : value
                }
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="bookings"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="No trend data" message="Sync data to see trends" />
        )}
      </ChartCard>
    </div>
  );
}
