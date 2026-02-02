"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { analyticsApi } from "@/lib/api/client";
import { useFilterStore } from "@/hooks/useFilters";
import KPICard from "@/components/KPICard";
import ChartCard from "@/components/ChartCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { GitBranch, MessageCircle, Calendar, TrendingUp } from "lucide-react";
import type { ConversionFunnelData, BySourceData } from "@/types/analytics";

const FUNNEL_COLORS = ["#3b82f6", "#60a5fa", "#93c5fd"];

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function Conversion() {
  const { getQueryParams } = useFilterStore();
  const params = getQueryParams();

  const { data: funnel, isLoading: funnelLoading } = useQuery<ConversionFunnelData>({
    queryKey: ["conversionFunnel", params],
    queryFn: () => analyticsApi.getConversionFunnel(params),
  });

  const { data: bySource, isLoading: sourceLoading } = useQuery<BySourceData>({
    queryKey: ["bySource", params],
    queryFn: () => analyticsApi.getBySource(params),
  });

  const isLoading = funnelLoading || sourceLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!funnel || funnel.stages.length === 0) {
    return <EmptyState />;
  }

  const funnelData = funnel.stages.map((stage, i) => ({
    name: stage.stage.charAt(0).toUpperCase() + stage.stage.slice(1).replace("_", " "),
    value: stage.count,
    fill: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
  }));

  const inquiries = funnel.stages.find((s) => s.stage === "inquiries")?.count || 0;
  const bookings = funnel.stages.find((s) => s.stage === "bookings")?.count || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Conversion Funnel</h2>
        <p className="text-slate-500">Track your inquiry to booking conversion rates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Total Inquiries" value={inquiries.toLocaleString()} icon={MessageCircle} />
        <KPICard title="Total Bookings" value={bookings.toLocaleString()} icon={Calendar} />
        <KPICard title="Conversion Rate" value={formatPercent(funnel.conversion_rate)} icon={TrendingUp} />
        <KPICard title="Funnel Stages" value={funnel.stages.length} icon={GitBranch} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Conversion Funnel" subtitle="Inquiry to booking journey">
          <div className="space-y-4">
            {funnelData.map((stage, index) => {
              const widthPercent = (stage.value / funnelData[0].value) * 100;
              return (
                <div key={stage.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{stage.name}</span>
                    <span className="text-sm text-slate-500">{stage.value.toLocaleString()}</span>
                  </div>
                  <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg transition-all duration-500"
                      style={{ width: `${widthPercent}%`, backgroundColor: stage.fill }}
                    />
                  </div>
                  {index < funnelData.length - 1 && (
                    <div className="text-xs text-slate-400 mt-1 text-right">
                      ↓ {((funnelData[index + 1].value / stage.value) * 100).toFixed(1)}% conversion
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title="Conversion by Source" subtitle="Which channels convert best">
          {bySource?.sources && bySource.sources.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={bySource.sources.map((s) => ({
                  source: s.source.toUpperCase(),
                  bookings: s.bookings,
                }))}
                layout="vertical"
              >
                <XAxis type="number" />
                <YAxis type="category" dataKey="source" width={80} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No source data" />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Funnel Stage Details" subtitle="Detailed breakdown of each stage">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 text-sm font-medium text-slate-500">Stage</th>
                <th className="text-right py-3 text-sm font-medium text-slate-500">Count</th>
                <th className="text-right py-3 text-sm font-medium text-slate-500">% of Total</th>
                <th className="text-right py-3 text-sm font-medium text-slate-500">Drop-off</th>
              </tr>
            </thead>
            <tbody>
              {funnelData.map((stage, i) => {
                const percentOfTotal = ((stage.value / funnelData[0].value) * 100).toFixed(1);
                const dropOff =
                  i > 0
                    ? (((funnelData[i - 1].value - stage.value) / funnelData[i - 1].value) * 100).toFixed(1)
                    : "-";
                return (
                  <tr key={stage.name} className="border-b last:border-0">
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.fill }} />
                        <span className="font-medium">{stage.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-4">{stage.value.toLocaleString()}</td>
                    <td className="text-right py-4">{percentOfTotal}%</td>
                    <td className="text-right py-4 text-red-500">
                      {dropOff !== "-" ? `${dropOff}%` : dropOff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
